# Connectors & channels

A **connector** brings the outside world onto memclaw's event bus. There are two ways
to add one.

## Option A — a platform channel (Telegram / Slack / Discord)

These use Mastra's built-in [channels](https://mastra.ai/docs/agents/channels) and the
[Chat SDK](https://chat-sdk.dev) adapters, already wired in `src/connectors/channels.ts`.
You only add credentials — no code.

### Telegram (easiest — no public URL)

Telegram runs in **long-polling** mode, so it works on your laptop with nothing exposed.

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Add to `.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
3. `npm run dev` (the Mastra server runs the channel). Message your bot.

### Slack / Discord (webhooks)

These need a public URL. Locally, tunnel the Mastra server:

```bash
npm run dev
npx cloudflared tunnel --url http://localhost:4111   # or: ngrok http 4111
```

Then add credentials to `.env`:

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_PUBLIC_KEY=...
DISCORD_APPLICATION_ID=...
```

Mastra exposes a webhook per platform at:

```
/api/agents/memclaw/channels/{platform}/webhook
```

Point the platform's webhook/interactions URL there (e.g.
`https://<tunnel>/api/agents/memclaw/channels/slack/webhook`). Full per-platform setup:
[Slack](https://chat-sdk.dev/adapters/slack) ·
[Discord](https://chat-sdk.dev/adapters/discord) ·
[Telegram](https://chat-sdk.dev/adapters/telegram).

A channel is enabled only when its credentials are present, so an empty `.env` starts
clean. Channels also get tool-approval cards for `requireApproval` tools for free.

## Option B — a custom connector (the bus way)

For surfaces Mastra doesn't ship (a web socket, an email inbox, a hardware button),
implement the `Connector` interface from `src/connectors/types.ts`. It talks only to the
bus, exactly like the terminal connector.

```typescript
import type { Connector } from './types.ts';
import { TOPICS } from '../bus/topics.ts';

export function createMyConnector(): Connector {
  return {
    name: 'my-connector',
    async start({ pubsub }) {
      // 1) deliver replies addressed to this connector
      await pubsub.subscribe(TOPICS.outbound, (event) => {
        const out = event.data;
        if (out.source !== 'my-connector') return;
        sendToMySurface(out.text);
      });

      // 2) publish inbound user messages
      onMessageFromMySurface(async (text, userId) => {
        await pubsub.publish(TOPICS.inbound, {
          type: 'message.inbound',
          runId: userId,
          data: {
            text,
            threadId: `my-${userId}`,   // scopes the conversation/memory
            resourceId: `my-${userId}`, // scopes long-term memory across threads
            source: 'my-connector',
            replyTo: userId,
          },
        });
      });
    },
  };
}
```

Then start it alongside the CLI connector in `src/runtime/start.ts` (or wherever you
boot the runtime):

```typescript
await startRuntime([createCliConnector(), createMyConnector()]);
```

Because everything goes through the bus, your connector is automatically observable in
the bus monitor (`GET /memclaw/bus`) and benefits from replay on reconnect.
