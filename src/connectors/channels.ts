/**
 * Platform channels (Telegram / Slack / Discord), powered by Mastra's built-in
 * channel system and the Chat SDK adapters.
 *
 * An adapter is only wired up when its credentials are present in the
 * environment, so an empty `.env` yields no channels and a clean startup. Add a
 * platform by dropping its credentials into `.env` — no code changes needed.
 *
 * Telegram runs in long-polling mode, so it needs NO public URL. Slack and
 * Discord use webhooks: run `mastra dev` and expose it with a tunnel
 * (`ngrok http 4111`). See docs/connectors.md.
 */
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createSlackAdapter } from '@chat-adapter/slack';
import { createDiscordAdapter } from '@chat-adapter/discord';

export interface ChannelsResult {
  channels: { adapters: Record<string, unknown> } | undefined;
  enabled: string[];
}

export function buildChannels(): ChannelsResult {
  const adapters: Record<string, unknown> = {};
  const enabled: string[] = [];

  if (process.env.TELEGRAM_BOT_TOKEN) {
    // Polling mode: works locally with no webhook/tunnel.
    adapters.telegram = createTelegramAdapter({ mode: 'polling' });
    enabled.push('telegram');
  }

  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET) {
    adapters.slack = createSlackAdapter();
    enabled.push('slack');
  }

  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_PUBLIC_KEY) {
    adapters.discord = createDiscordAdapter();
    enabled.push('discord');
  }

  return {
    channels: enabled.length > 0 ? { adapters } : undefined,
    enabled,
  };
}
