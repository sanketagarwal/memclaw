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
import { TOPICS } from '../bus/topics.ts';
import { loadCapabilities } from '../capabilities/index.ts';
import { createMemclawAgent } from '../agents/memclaw-agent.ts';
import { createCheckinWorkflow } from '../workflows/scheduled-checkin.ts';
import { createWebhookSignals } from '../signals/webhooks.ts';

const logger = new PinoLogger({ name: 'memclaw', level: 'info' });

// Load capabilities (built-in + any external packages) and build the agent from
// what they contribute. This is the one place capabilities get assembled.
export const capabilityBundle = await loadCapabilities(config, {
  warn: (m) => logger.warn(m),
  error: (m) => logger.error(m),
});
logger.info('[capabilities] active', {
  active: capabilityBundle.active.map((c) => c.id),
  tools: Object.keys(capabilityBundle.tools),
});
// Inbound external events (webhooks → agent signals). Undefined unless enabled.
// The SAME instance is attached to the agent and used by the webhook route.
export const webhookSignals = createWebhookSignals(config);
const memclawAgent = createMemclawAgent(
  capabilityBundle,
  config,
  webhookSignals ? [webhookSignals] : undefined,
);
if (webhookSignals) logger.info('[webhooks] inbound event signals enabled');

// The event bus. Every connector, the dispatcher, the monitor, and Mastra's own
// internal systems (workflows, agent streams, tasks) ride this one transport.
const pubsub = await createPubSub(config);

// Shared so the /memclaw/bus route can read live stats. Assigned just below,
// after the Mastra instance exists (the route closes over this binding).
let busMonitor: BusMonitor | undefined;

// Proactive scheduler: registered only when enabled, so nothing fires by
// default. Mastra's built-in scheduler picks up the `schedule` on boot.
const workflows = config.schedule
  ? { proactiveCheckin: createCheckinWorkflow(config) }
  : undefined;
if (config.schedule) {
  logger.info('[schedule] proactive run enabled', {
    cron: config.scheduleCron,
    timezone: config.scheduleTimezone ?? '(host)',
  });
}

export const mastra = new Mastra({
  agents: { memclaw: memclawAgent },
  workflows,
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
      // Inbound webhooks → agent signals, e.g. POST /webhooks/github .
      // Always registered; disabled unless MEMCLAW_WEBHOOKS is on. Mirrors
      // every matched event onto the bus. (Kept as a plain array element —
      // a conditional spread here breaks Mastra's route-manifest bundling.)
      registerApiRoute('/webhooks/:source', {
        method: 'POST',
        handler: async (c) => {
          if (!webhookSignals) {
            return c.json({ ok: false, error: 'webhooks disabled (set MEMCLAW_WEBHOOKS=true)' }, 404);
          }
          const body = await c.req.json().catch(() => ({}));
          const headers = Object.fromEntries(c.req.raw.headers);
          const source = c.req.param('source');
          const result = (await webhookSignals.handleWebhook({ body, headers })) as {
            body?: { matched?: number };
          };
          const matched = result?.body?.matched ?? 0;
          // Observable: every external event shows up on the bus + Studio.
          await pubsub.publish(TOPICS.externalEvent, {
            type: 'event.external',
            runId: `wh-${source}`,
            data: { source, matched },
          });
          return c.json({ ok: true, matched });
        },
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
