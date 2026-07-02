# Inbound webhooks → agent signals

memclaw can receive events from external systems (GitHub, Stripe, a CRM, a home
sensor…) and inject them into a conversation as **notification signals** — using
Mastra's `WebhookSignalProvider`. This is the inbound counterpart to memclaw's
outbound bus/connectors: a single conversation can hold your messages *and* events
from multiple external sources, without restarting the run or losing the prompt cache.

## Enable it

```bash
# .env
MEMCLAW_WEBHOOKS=true
npm run dev          # mounts POST /webhooks/:source
```

Real providers need a public URL — tunnel locally:

```bash
npx cloudflared tunnel --url http://localhost:4111   # or: ngrok http 4111
```

Point the provider's webhook at `https://<tunnel>/webhooks/<source>` (e.g. `/webhooks/github`).

## How events are routed

1. A webhook arrives at `POST /webhooks/:source`.
2. The provider's `extractResourceId` pulls an id from the payload. memclaw's generic
   provider reads `payload.resource`, `payload.externalResourceId`, or
   `payload.repository.full_name` — extend `src/signals/webhooks.ts` for other shapes.
3. Any **thread subscribed to that resource** gets a notification signal (`urgent`).
4. Every event is also published to the bus (`memclaw.event.external`), so it's visible
   in the bus monitor and Studio — even with no subscription.

## Subscribe a conversation to a resource

Bind a thread (a conversation) to an external resource so its events land there:

```typescript
import { webhookSignals } from './src/mastra/index.ts';

webhookSignals.subscribeThread(
  { threadId: 'my-conversation', resourceId: 'memclaw' },
  'acme/repo',            // the id extractResourceId returns
);
// later: webhookSignals.unsubscribeThread({ threadId, resourceId }, 'acme/repo');
```

After this, a webhook whose payload resolves to `acme/repo` is delivered into the
`my-conversation` thread as a notification the agent can react to.

> **Roadmap:** exposing `subscribe`/`unsubscribe` as agent tools (so you can say "watch
> acme/repo in this chat" and the agent binds the current conversation) is a natural next
> step — `WebhookSignalProvider` supports the tool hook, it's just not wired yet.

## Customizing

Everything lives in `src/signals/webhooks.ts`:

- `extractResourceId(payload)` — identify which resource an event belongs to.
- `buildNotification(payload, subscription)` — shape what the agent sees (source, kind,
  `priority`, summary, payload).

For multiple distinct sources with different payload shapes, create more providers and
add them to the agent's `signals` array.
