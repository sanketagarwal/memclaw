/**
 * Boots the bus runtime: wire the dispatcher to the agent, then start the given
 * connectors. Everything shares the one bus configured on the Mastra instance,
 * so connectors, the dispatcher, and the monitor all see the same events.
 */
import { mastra } from '../mastra/index.ts';
import { startDispatcher } from './dispatcher.ts';
import type { Connector } from '../connectors/types.ts';

export async function startRuntime(connectors: Connector[]): Promise<void> {
  const pubsub = mastra.pubsub;
  const agent = mastra.getAgent('memclaw');

  await startDispatcher({ pubsub, agent });

  for (const connector of connectors) {
    await connector.start({ pubsub });
  }
}
