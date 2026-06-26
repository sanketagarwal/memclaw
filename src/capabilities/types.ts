/**
 * Capabilities are memclaw's unit of extension — its answer to "skills".
 *
 * A capability is a small, self-contained bundle that gives the agent new ways
 * to get work done. It can contribute:
 *   - tools      (functions the agent calls)
 *   - agents     (specialist sub-agents the orchestrator delegates to)
 *   - workflows  (multi-step pipelines, exposed to the agent as tools)
 *
 * Anyone can ship one: drop a folder under `src/capabilities/<name>/` and add it
 * to the registry, or publish an npm package and list it in MEMCLAW_CAPABILITIES.
 * See docs/capabilities.md.
 */
import type { MemclawConfig } from '../config.ts';

export interface CapabilityEnvVar {
  /** Environment variable name, e.g. "GITHUB_TOKEN". */
  name: string;
  /** What it's for, shown by `memclaw doctor`. */
  description: string;
  /** If true and unset, the capability reports as "needs setup". */
  required?: boolean;
}

export interface Capability {
  /** Unique, kebab-case identifier, e.g. "web", "github". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One line: what this lets the agent do. */
  description: string;
  version?: string;
  author?: string;
  homepage?: string;

  /** Tools contributed to the agent, keyed by tool name. */
  tools?: Record<string, unknown>;
  /** Specialist sub-agents — Mastra exposes each to the orchestrator as a tool. */
  agents?: Record<string, unknown>;
  /** Workflows — also exposed to the agent as callable tools. */
  workflows?: Record<string, unknown>;

  /** Environment variables this capability uses. Surfaced by `doctor`. */
  env?: CapabilityEnvVar[];

  /**
   * Optional gate. Return false to keep the capability out of the agent (for
   * example, when a required key is missing or a config flag is off). Receives
   * the resolved memclaw config for convenience.
   */
  enabled?: (config: MemclawConfig) => boolean;
}

/**
 * Identity helper that gives you type-checking and editor autocomplete when
 * authoring a capability. Always wrap your export in this.
 */
export function defineCapability(capability: Capability): Capability {
  return capability;
}
