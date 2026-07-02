/**
 * Boots the bus runtime: wire the dispatcher to the agent, then start the given
 * connectors. Everything shares the one bus configured on the Mastra instance,
 * so connectors, the dispatcher, and the monitor all see the same events.
 */
import { mastra } from '../mastra/index.ts';
import { config } from '../config.ts';
import { startDispatcher } from './dispatcher.ts';
import type { Connector } from '../connectors/types.ts';

export async function startRuntime(connectors: Connector[]): Promise<void> {
  const pubsub = mastra.pubsub;
  // When the team is enabled, the terminal/chat drives the Chief-of-Staff
  // orchestrator (which delegates); otherwise the single memclaw agent.
  const agentId = config.team ? 'chief-of-staff' : 'memclaw';
  const agent = mastra.getAgent(agentId);

  await startDispatcher({ pubsub, agent });

  for (const connector of connectors) {
    await connector.start({ pubsub });
  }
}
