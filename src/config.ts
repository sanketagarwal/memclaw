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
  /** Give the agent a local workspace (filesystem + sandbox/shell). */
  workspace: boolean;
  /** Directory the workspace is rooted at. */
  workspaceDir: string;
  /** External capability packages to load, from MEMCLAW_CAPABILITIES. */
  capabilities: string[];
  /** Enable the proactive scheduled run (cron). */
  schedule: boolean;
  /** Cron expression for the scheduled run. */
  scheduleCron: string;
  /** IANA timezone for the schedule (defaults to host). */
  scheduleTimezone?: string;
  /** Prompt the agent runs on each scheduled fire. */
  schedulePrompt: string;
  /** Where to deliver scheduled output, e.g. "telegram:123456" (else bus-only). */
  scheduleDeliverTo?: string;
  /** Accept inbound webhooks as agent signals (external events). */
  webhooks: boolean;
  /** Register the example multi-agent research team orchestrator. */
  team: boolean;
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
    workspace: bool(process.env.MEMCLAW_WORKSPACE),
    workspaceDir: process.env.MEMCLAW_WORKSPACE_DIR ?? './workspace',
    capabilities: (process.env.MEMCLAW_CAPABILITIES ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    schedule: bool(process.env.MEMCLAW_SCHEDULE),
    scheduleCron: process.env.MEMCLAW_SCHEDULE_CRON ?? '0 8 * * *',
    scheduleTimezone: process.env.MEMCLAW_SCHEDULE_TIMEZONE,
    schedulePrompt:
      process.env.MEMCLAW_SCHEDULE_PROMPT ??
      'Proactive check-in: based on what you remember about me and my goals, give me a brief, useful daily digest. If you have nothing useful to add, say so in one line.',
    scheduleDeliverTo: process.env.MEMCLAW_SCHEDULE_DELIVER_TO,
    webhooks: bool(process.env.MEMCLAW_WEBHOOKS),
    team: bool(process.env.MEMCLAW_TEAM),
  };
}

export const config = loadConfig();
