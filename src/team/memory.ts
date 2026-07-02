/**
 * Memory factory for multi-agent teams.
 *
 * Every agent — the orchestrator and each specialist — gets its OWN memory
 * instance built here. That's how the memory split works:
 *
 *   - The orchestrator's memory is the SHARED team memory: it accumulates the
 *     whole coordination (your request, each delegation, each result).
 *   - Each specialist's memory is INDIVIDUAL: Mastra's supervisor isolates it,
 *     saving only that specialist's own delegation prompt + response, on a fresh
 *     thread per invocation. Specialists never see each other's memory.
 *
 * Use `scope: 'resource'` for memory that persists across conversations (a
 * long-lived shared brain for the orchestrator); the default `'thread'` scopes
 * memory to the current conversation.
 */
import { Memory } from '@mastra/memory';
import { config } from '../config.ts';

export interface AgentMemoryOptions {
  /** Observer/Reflector model. Defaults to MEMCLAW_MEMORY_MODEL. */
  model?: string;
  /** 'thread' (per-conversation, default) or 'resource' (across conversations). */
  scope?: 'thread' | 'resource';
  /** Structured working memory (name, prefs, goals). Default: true. */
  workingMemory?: boolean;
}

export function createAgentMemory(opts: AgentMemoryOptions = {}): Memory {
  return new Memory({
    options: {
      workingMemory: { enabled: opts.workingMemory ?? true },
      observationalMemory: {
        model: opts.model ?? config.memoryModel,
        ...(opts.scope ? { scope: opts.scope } : {}),
      },
    },
  });
}
