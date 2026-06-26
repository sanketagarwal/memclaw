/**
 * The dispatcher is the heart of the bus loop.
 *
 * It subscribes to inbound messages, runs the agent (scoped to the message's
 * memory thread + resource), and publishes the reply back onto the bus along
 * with run lifecycle events the monitor counts. Connectors never call the agent
 * directly — they only speak to the bus — which keeps surfaces and reasoning
 * fully decoupled.
 */
import type { Agent } from '@mastra/core/agent';
import type { Event, PubSub } from '@mastra/core/events';
import { TOPICS, type InboundMessage } from '../bus/topics.ts';

export interface DispatcherOptions {
  pubsub: PubSub;
  agent: Agent;
}

export async function startDispatcher({ pubsub, agent }: DispatcherOptions): Promise<void> {
  let counter = 0;

  await pubsub.subscribe(TOPICS.inbound, async (event: Event) => {
    const msg = event.data as InboundMessage;
    const runId = `run-${msg.threadId}-${++counter}`;
    const started = Date.now();

    await pubsub.publish(TOPICS.runStarted, {
      type: 'run.started',
      runId,
      data: { source: msg.source, threadId: msg.threadId },
    });

    try {
      const result = await agent.generate(msg.text, {
        memory: { thread: msg.threadId, resource: msg.resourceId },
      });
      const text = (result as { text: string }).text;
      const latencyMs = Date.now() - started;

      await pubsub.publish(TOPICS.outbound, {
        type: 'message.outbound',
        runId,
        data: { text, threadId: msg.threadId, source: msg.source, replyTo: msg.replyTo, latencyMs },
      });
      await pubsub.publish(TOPICS.runCompleted, {
        type: 'run.completed',
        runId,
        data: { source: msg.source, latencyMs },
      });
    } catch (err) {
      const latencyMs = Date.now() - started;
      const text = `⚠️ ${err instanceof Error ? err.message : String(err)}`;

      await pubsub.publish(TOPICS.outbound, {
        type: 'message.outbound',
        runId,
        data: { text, threadId: msg.threadId, source: msg.source, replyTo: msg.replyTo, latencyMs },
      });
      await pubsub.publish(TOPICS.runFailed, {
        type: 'run.failed',
        runId,
        data: { source: msg.source, error: text },
      });
    }
  });
}
