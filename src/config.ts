/**
 * Central, env-driven configuration for memclaw.
 *
 * Everything that can be tuned without touching code lives here, so the rest of
 * the codebase reads from a single typed object instead of poking at
 * `process.env` directly.
 */

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export type PubSubBackend = 'memory' | 'unix' | 'redis';

export interface MemclawConfig {
  /** Primary agent model in Mastra `provider/model` routing form. */
  model: string;
  /** Background Observational Memory model (Observer + Reflector). */
  memoryModel: string;
  /** Which pub/sub transport backs the event bus. */
  pubsub: PubSubBackend;
  /** Unix socket path used when `pubsub === 'unix'`. */
  pubsubSocket: string;
  /** Redis connection string used when `pubsub === 'redis'`. */
  redisUrl?: string;
  /** Give the agent a real Playwright browser. */
  browser: boolean;
  /** Run the browser headless (no visible window). */
  browserHeadless: boolean;
  /** Expose a shell-exec tool to the agent (dangerous; off by default). */
  enableShell: boolean;
}

export function loadConfig(): MemclawConfig {
  const pubsub = (process.env.MEMCLAW_PUBSUB ?? 'memory') as PubSubBackend;
  return {
    model: process.env.MEMCLAW_MODEL ?? 'openai/gpt-5-mini',
    memoryModel:
      process.env.MEMCLAW_MEMORY_MODEL ?? process.env.MEMCLAW_MODEL ?? 'openai/gpt-5-mini',
    pubsub,
    pubsubSocket: process.env.MEMCLAW_PUBSUB_SOCKET ?? '/tmp/mastra/memclaw.sock',
    redisUrl: process.env.REDIS_URL,
    browser: bool(process.env.MEMCLAW_BROWSER),
    browserHeadless: bool(process.env.MEMCLAW_BROWSER_HEADLESS, true),
    enableShell: bool(process.env.MEMCLAW_ENABLE_SHELL),
  };
}

export const config = loadConfig();
