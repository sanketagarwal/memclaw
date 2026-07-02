/**
 * Inbound external events, via Mastra's WebhookSignalProvider.
 *
 * This is the counterpart to memclaw's outbound bus/connectors: an external
 * system (GitHub, Stripe, a CRM, a home sensor…) POSTs a webhook, and the
 * payload becomes a *notification signal* injected into a subscribed agent
 * thread — no restart, no lost prompt cache. A single conversation can hold your
 * messages alongside events from multiple external sources.
 *
 * memclaw ships a GENERIC provider: it pulls a resource id from common payload
 * shapes and builds an urgent notification. Enable with MEMCLAW_WEBHOOKS=true;
 * see docs/webhooks.md for how to subscribe a conversation to a resource.
 */
import { WebhookSignalProvider } from '@mastra/core/signals';
import type { MemclawConfig } from '../config.ts';

export function createWebhookSignals(config: MemclawConfig): WebhookSignalProvider | undefined {
  if (!config.webhooks) return undefined;

  return new WebhookSignalProvider({
    id: 'memclaw-webhooks',
    name: 'memclaw Webhooks',
    // Identify which external resource an event belongs to. Handles the common
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
