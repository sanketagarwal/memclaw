/**
 * Proactive scheduled run — memclaw's "do things on its own, 24/7" loop.
 *
 * This uses Mastra's NATIVE scheduled-workflow feature: declaring `schedule`
 * makes Mastra's built-in scheduler fire the workflow on the cron you set (no
 * separate registration). The step runs the agent and publishes the result onto
 * the event bus, so it's observable in the bus monitor and traced in Studio,
 * and visible/pausable in Studio's Schedules view.
 *
 * It's only registered when MEMCLAW_SCHEDULE=true, so nothing fires by default.
 *
 * Note: the built-in scheduler is a tick loop that needs a long-lived host
 * process. Run memclaw as a persistent daemon (or deploy it) for this to fire;
 * it won't tick on serverless platforms.
 */
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import type { MemclawConfig } from '../config.ts';
import { TOPICS } from '../bus/topics.ts';
import { parseDeliveryTarget, deliver } from '../connectors/deliver.ts';

export function createCheckinWorkflow(config: MemclawConfig) {
  const run = createStep({
    id: 'proactive-run',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.object({ text: z.string() }),
    execute: async ({ inputData, mastra }) => {
      if (!mastra) return { text: '' };

      const startedAt = Date.now();
      const agent = mastra.getAgent('memclaw');
      const result = await agent.generate(inputData.prompt, {
        // A stable thread/resource so proactive runs accrue their own memory.
        memory: { thread: 'scheduled-checkin', resource: 'memclaw-system' },
      });
      const text = (result as { text: string }).text;
      const latencyMs = Date.now() - startedAt;
      const runId = `proactive-${startedAt}`;

      // Deliver to a chat surface if configured (else bus-only).
      let delivered: string | undefined;
      const target = parseDeliveryTarget(config.scheduleDeliverTo);
      if (target) {
        const r = await deliver(target, text);
        delivered = r.ok ? `${target.kind} ✓` : `${target.kind} ✗ (${r.detail})`;
        mastra.getLogger?.()?.info?.(`[schedule] delivery → ${delivered}`);
      }

      // Observable: shows up in the bus monitor and Studio.
      await mastra.pubsub.publish(TOPICS.proactive, {
        type: 'agent.proactive',
        runId,
        data: { text, source: 'scheduler', latencyMs, delivered },
      });
      // Deliverable: any connector listening for outbound can forward it.
      await mastra.pubsub.publish(TOPICS.outbound, {
        type: 'message.outbound',
        runId,
        data: { text, threadId: 'scheduled-checkin', source: 'scheduler', latencyMs },
      });

      return { text };
    },
  });

  return createWorkflow({
    id: 'proactive-checkin',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.object({ text: z.string() }),
    schedule: {
      cron: config.scheduleCron,
      timezone: config.scheduleTimezone,
      inputData: { prompt: config.schedulePrompt },
    },
  })
    .then(run)
    .commit();
}
