import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability';

import { config } from '../config.ts';
import { createPubSub } from '../bus/pubsub.ts';
import { BusMonitor } from '../bus/monitor.ts';
import { memclawAgent } from '../agents/memclaw-agent.ts';

const logger = new PinoLogger({ name: 'memclaw', level: 'info' });

// The event bus. Every connector, the dispatcher, the monitor, and Mastra's own
// internal systems (workflows, agent streams, tasks) ride this one transport.
const pubsub = await createPubSub(config);

// Shared so the /memclaw/bus route can read live stats. Assigned just below,
// after the Mastra instance exists (the route closes over this binding).
let busMonitor: BusMonitor | undefined;

export const mastra = new Mastra({
  agents: { memclaw: memclawAgent },
  pubsub,
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:./mastra.db',
    }),
    domains: {
      // DuckDB is a great fit for the analytical observability workload.
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  logger,
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'memclaw',
        exporters: [
          // Persist traces to storage so Mastra Studio can render them.
          new MastraStorageExporter(),
        ],
        spanOutputProcessors: [
          // Redact secrets (tokens, passwords, keys) from captured spans.
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
  server: {
    apiRoutes: [
      // Live bus metrics: `curl http://localhost:4111/memclaw/bus`
      registerApiRoute('/memclaw/bus', {
        method: 'GET',
        handler: async (c) =>
          c.json(busMonitor?.getStats() ?? { error: 'bus monitor not started yet' }),
      }),
    ],
  },
});

// Start watching the bus. Runs in whatever process imports this module — the
// `mastra dev` Studio server and the `memclaw start`/`chat` runtime alike.
busMonitor = new BusMonitor(mastra.pubsub, config.pubsub, logger);
await busMonitor.start();

export function getBusMonitor(): BusMonitor | undefined {
  return busMonitor;
}
