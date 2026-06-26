/**
 * Builds the pub/sub backend that powers memclaw's event bus.
 *
 * The same `PubSub` contract is implemented by every backend, so the rest of the
 * app never changes when you scale from one process to many machines — you only
 * flip `MEMCLAW_PUBSUB` in `.env`.
 *
 *   memory -> in-process delivery wrapped in a replay cache (zero infra default)
 *   unix   -> Unix domain socket shared by every process on one host
 *   redis  -> distributed Redis Streams across hosts (optional dependency)
 */
import { CachingPubSub, EventEmitterPubSub, UnixSocketPubSub } from '@mastra/core/events';
import type { PubSub } from '@mastra/core/events';
import { InMemoryServerCache } from '@mastra/core/cache';
import type { MemclawConfig } from '../config.ts';

export async function createPubSub(config: MemclawConfig): Promise<PubSub> {
  switch (config.pubsub) {
    case 'unix':
      // Multiple local processes (e.g. `mastra dev` + `memclaw start`) share one
      // bus. One process is elected broker; the rest connect over the socket.
      return new UnixSocketPubSub(config.pubsubSocket);

    case 'redis': {
      if (!config.redisUrl) {
        throw new Error(
          'MEMCLAW_PUBSUB=redis requires REDIS_URL to be set in your .env file.',
        );
      }
      let mod: { RedisStreamsPubSub: new (opts: { url: string }) => PubSub };
      try {
        // Optional dependency — kept out of the default install to stay lean.
        // Non-literal specifier so TypeScript doesn't require it at build time.
        const specifier = '@mastra/redis-streams';
        mod = (await import(specifier)) as never;
      } catch {
        throw new Error(
          'MEMCLAW_PUBSUB=redis requires the @mastra/redis-streams package.\n' +
            'Install it with: npm install @mastra/redis-streams',
        );
      }
      return new mod.RedisStreamsPubSub({ url: config.redisUrl });
    }

    case 'memory':
    default:
      // EventEmitter delivers in-process; CachingPubSub records per-topic history
      // so a connector that reconnects can replay what it missed.
      return new CachingPubSub(new EventEmitterPubSub(), new InMemoryServerCache());
  }
}
