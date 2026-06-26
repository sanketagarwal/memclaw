/**
 * Loads capabilities and merges what they contribute into one bundle the agent
 * consumes. Sources, in order:
 *   1. built-in capabilities (the registry)
 *   2. external npm packages listed in MEMCLAW_CAPABILITIES
 *
 * Each capability can gate itself with `enabled(config)`; gated-off ones are
 * reported as skipped (handy for `doctor`) rather than silently dropped.
 */
import type { MemclawConfig } from '../config.ts';
import type { Capability } from './types.ts';
import { builtinCapabilities } from './registry.ts';

export interface LoaderLogger {
  warn?: (message: string) => void;
  error?: (message: string) => void;
}

export interface CapabilityBundle {
  /** Capabilities that are active for this run. */
  active: Capability[];
  /** Capabilities present but gated off, with the reason. */
  skipped: { capability: Capability; reason: string }[];
  /** Merged tools across all active capabilities. */
  tools: Record<string, unknown>;
  /** Merged sub-agents across all active capabilities. */
  agents: Record<string, unknown>;
  /** Merged workflows across all active capabilities. */
  workflows: Record<string, unknown>;
}

async function loadExternal(
  packages: string[],
  logger?: LoaderLogger,
): Promise<Capability[]> {
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

    active.push(cap);
    Object.assign(tools, cap.tools ?? {});
    Object.assign(agents, cap.agents ?? {});
    Object.assign(workflows, cap.workflows ?? {});
  }

  return { active, skipped, tools, agents, workflows };
}
