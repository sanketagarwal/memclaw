/**
 * Loads capabilities and merges what they contribute into one bundle the agent
 * consumes. Sources, in order:
 *   1. built-in capabilities (the registry)
 *   2. external npm packages listed in MEMCLAW_CAPABILITIES
 *
 * A capability can contribute tools/agents/workflows as static records or as
 * provider functions (sync or async) — the latter is how the MCP capability
 * fetches tools from external servers at startup. Each capability can also gate
 * itself with `enabled(config)`; gated-off or failed capabilities are reported
 * as skipped rather than silently dropped.
 */
import type { MemclawConfig } from '../config.ts';
import type { Capability, Provider } from './types.ts';
import { builtinCapabilities } from './registry.ts';

export interface LoaderLogger {
  warn?: (message: string) => void;
  error?: (message: string) => void;
}

/** An active capability with the names of what it actually contributed. */
export interface ResolvedCapability {
  capability: Capability;
  tools: string[];
  agents: string[];
  workflows: string[];
}

export interface CapabilityBundle {
  /** Active capability objects. */
  active: Capability[];
  /** Active capabilities with their resolved contribution names (for `caps`). */
  resolved: ResolvedCapability[];
  /** Capabilities present but gated off or failed, with the reason. */
  skipped: { capability: Capability; reason: string }[];
  /** Merged tools across all active capabilities. */
  tools: Record<string, unknown>;
  /** Merged sub-agents across all active capabilities. */
  agents: Record<string, unknown>;
  /** Merged workflows across all active capabilities. */
  workflows: Record<string, unknown>;
}

async function resolve<T>(
  provider: Provider<T> | undefined,
  config: MemclawConfig,
): Promise<T | undefined> {
  if (provider === undefined) return undefined;
  return typeof provider === 'function'
    ? await (provider as (c: MemclawConfig) => T | Promise<T>)(config)
    : provider;
}

async function loadExternal(packages: string[], logger?: LoaderLogger): Promise<Capability[]> {
  const out: Capability[] = [];
  for (const pkg of packages) {
    try {
      const mod = (await import(pkg)) as Record<string, unknown>;
      const exported = mod.default ?? mod.capability ?? mod.capabilities;
      if (Array.isArray(exported)) out.push(...(exported as Capability[]));
      else if (exported) out.push(exported as Capability);
      else logger?.warn?.(`[capabilities] "${pkg}" has no default/capability export — skipped`);
    } catch (err) {
      logger?.error?.(
        `[capabilities] failed to load "${pkg}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return out;
}

export async function loadCapabilities(
  config: MemclawConfig,
  logger?: LoaderLogger,
): Promise<CapabilityBundle> {
  const all: Capability[] = [
    ...builtinCapabilities,
    ...(await loadExternal(config.capabilities, logger)),
  ];

  const active: Capability[] = [];
  const resolved: ResolvedCapability[] = [];
  const skipped: { capability: Capability; reason: string }[] = [];
  const tools: Record<string, unknown> = {};
  const agents: Record<string, unknown> = {};
  const workflows: Record<string, unknown> = {};

  const seenIds = new Set<string>();

  for (const cap of all) {
    if (seenIds.has(cap.id)) {
      logger?.warn?.(`[capabilities] duplicate id "${cap.id}" — keeping the first`);
      continue;
    }
    seenIds.add(cap.id);

    if (cap.enabled && !cap.enabled(config)) {
      skipped.push({ capability: cap, reason: 'gated off by enabled()' });
      continue;
    }

    try {
      const capTools = (await resolve(cap.tools, config)) ?? {};
      const capAgents = (await resolve(cap.agents, config)) ?? {};
      const capWorkflows = (await resolve(cap.workflows, config)) ?? {};

      Object.assign(tools, capTools);
      Object.assign(agents, capAgents);
      Object.assign(workflows, capWorkflows);

      active.push(cap);
      resolved.push({
        capability: cap,
        tools: Object.keys(capTools),
        agents: Object.keys(capAgents),
        workflows: Object.keys(capWorkflows),
      });
    } catch (err) {
      skipped.push({
        capability: cap,
        reason: `failed to load: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { active, resolved, skipped, tools, agents, workflows };
}
