/**
 * The method for building a multi-agent system in memclaw.
 *
 * `defineSpecialist(...)` makes a focused worker agent with its own memory.
 * `defineOrchestrator(...)` makes a supervisor that manages specialists and
 * delegates to them (Mastra's supervisor pattern — the orchestrator's model
 * reads each specialist's `description` to decide who does what, calls them via
 * its own run, and synthesizes the results).
 *
 * Both return a plain Mastra `Agent`, so you register an orchestrator in the
 * Mastra instance like any agent and call it with `.generate()` / `.stream()`.
 * See docs/multi-agent.md for a full walkthrough.
 */
import { Agent } from '@mastra/core/agent';
import { config } from '../config.ts';
import { createAgentMemory } from './memory.ts';

export interface SpecialistSpec {
  /** Unique id, kebab-case (also how the orchestrator refers to it). */
  id: string;
  name?: string;
  /** REQUIRED: the orchestrator reads this to decide when to delegate here. */
  description: string;
  /** The specialist's own system prompt. */
  instructions: string;
  /** Model (provider/model). Defaults to MEMCLAW_MODEL. */
  model?: string;
  /** Tools this specialist can call. */
  tools?: Record<string, unknown>;
  /** Memory scope for this specialist (default 'thread' — individual). */
  memoryScope?: 'thread' | 'resource';
}

/** A focused worker agent with its own individual memory. */
export function defineSpecialist(spec: SpecialistSpec): Agent {
  return new Agent({
    id: spec.id,
    name: spec.name ?? spec.id,
    description: spec.description,
    instructions: spec.instructions,
    model: spec.model ?? config.model,
    tools: (spec.tools ?? {}) as never,
    memory: createAgentMemory({ scope: spec.memoryScope }),
  });
}

export interface OrchestratorSpec {
  id: string;
  name?: string;
  /** How the orchestrator should coordinate — name the specialists and when to use each. */
  instructions: string;
  model?: string;
  /** The specialists this orchestrator manages, keyed by name. */
  agents: Record<string, Agent>;
  /** Optional tools the orchestrator can also call directly. */
  tools?: Record<string, unknown>;
  /**
   * Memory scope for the orchestrator's SHARED team memory. Defaults to
   * 'resource' so the team's context persists across conversations.
   */
  memoryScope?: 'thread' | 'resource';
}

/** A supervisor agent that manages and delegates to specialist agents. */
export function defineOrchestrator(spec: OrchestratorSpec): Agent {
  return new Agent({
    id: spec.id,
    name: spec.name ?? spec.id,
    instructions: spec.instructions,
    model: spec.model ?? config.model,
    // Assigning specialists here is what makes this a supervisor: Mastra
    // exposes each one to the orchestrator's model as a delegate.
    agents: spec.agents as never,
    tools: (spec.tools ?? {}) as never,
    // The orchestrator's own memory = the shared team memory.
    memory: createAgentMemory({ scope: spec.memoryScope ?? 'resource' }),
  });
}
