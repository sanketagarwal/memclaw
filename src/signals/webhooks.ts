/**
 * Inbound external events, via Mastra's WebhookSignalProvider.
 *
 * This is the counterpart to memclaw's outbound bus/connectors: an external
 * system (GitHub, Stripe, a CRM, a home sensor…) POSTs a webhook, and the
 * payload becomes a *notification signal* injected into a subscribed agent
 * thread — no restart, no lost prompt cache.
 *
 * Subscription is conversational: the provider exposes `watch-source` /
 * `unwatch-source` tools (auto-merged into the agent), so you can just say
 * "watch acme/repo in this chat" and the agent binds the current conversation.
 *
 * Enable with MEMCLAW_WEBHOOKS=true; see docs/webhooks.md.
 */
import { WebhookSignalProvider } from '@mastra/core/signals';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { MemclawConfig } from '../config.ts';

/** The current conversation, as seen by a tool at execution time. */
interface ToolThreadContext {
  threadId?: string;
  resourceId?: string;
}

/**
 * WebhookSignalProvider + agent tools to subscribe/unsubscribe the current
 * conversation to an external resource.
 */
class MemclawWebhookSignals extends WebhookSignalProvider {
  getTools(): Record<string, unknown> {
    return {
      watchSource: createTool({
        id: 'watch-source',
        description:
          'Subscribe THIS conversation to an external event source so its webhooks arrive here as notifications. The resource is the id the webhook payload resolves to — e.g. a GitHub repo "owner/name". Use when the user says something like "watch/notify me about <resource> in this chat".',
        inputSchema: z.object({
          resource: z.string().describe('External resource id to watch, e.g. "acme/repo"'),
        }),
        outputSchema: z.object({ watching: z.string(), thread: z.string().nullable() }),
        execute: async ({ resource }, ctx) => {
          const { threadId, resourceId } = (ctx ?? {}) as ToolThreadContext;
          if (!threadId || !resourceId) {
            throw new Error(
              'No active conversation to subscribe — run this inside a chat thread.',
            );
          }
          this.subscribeThread({ threadId, resourceId }, resource);
          return { watching: resource, thread: threadId };
        },
      }),
      unwatchSource: createTool({
        id: 'unwatch-source',
        description:
          'Unsubscribe THIS conversation from an external event source it was previously watching.',
        inputSchema: z.object({
          resource: z.string().describe('External resource id to stop watching'),
        }),
        outputSchema: z.object({ removed: z.boolean(), resource: z.string() }),
        execute: async ({ resource }, ctx) => {
          const { threadId, resourceId } = (ctx ?? {}) as ToolThreadContext;
          if (!threadId || !resourceId) return { removed: false, resource };
          const removed = this.unsubscribeThread({ threadId, resourceId }, resource);
          return { removed, resource };
        },
      }),
    };
  }
}

export function createWebhookSignals(config: MemclawConfig): WebhookSignalProvider | undefined {
  if (!config.webhooks) return undefined;

  return new MemclawWebhookSignals({
    id: 'memclaw-webhooks',
    name: 'memclaw Webhooks',
    // Identify which external resource an event belongs to. Handles common
    // shapes out of the box; extend for provider-specific payloads.
    extractResourceId: (payload) => {
      const p = (payload ?? {}) as Record<string, unknown> & {
        repository?: { full_name?: string };
      };
      return (
        (p.resource as string | undefined) ??
        (p.externalResourceId as string | undefined) ??
        p.repository?.full_name
      );
    },
    // Shape the notification the agent sees. `urgent` nudges the agent to react.
    buildNotification: (payload, subscription) => {
      const p = (payload ?? {}) as Record<string, unknown>;
      const kind = (p.action as string) ?? (p.type as string) ?? 'event';
      return {
        source: 'webhook',
        kind,
        priority: 'urgent',
        summary: `${kind} for ${subscription.externalResourceId}`,
        payload,
      };
    },
  });
}
