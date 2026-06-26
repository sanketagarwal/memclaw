/**
 * The memclaw agent — one capable, memory-backed orchestrator wired to the full
 * Mastra stack: observational + working memory, capabilities (tools, sub-agents,
 * workflows), an optional real browser, and platform channels.
 *
 * It's built from a capability bundle, so what the agent can do is entirely
 * determined by which capabilities are active. Adding abilities never touches
 * this file — you ship a capability. See docs/capabilities.md.
 */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import type { MemclawConfig } from '../config.ts';
import type { CapabilityBundle } from '../capabilities/index.ts';
import { createBrowser } from '../browser/index.ts';
import { buildChannels } from '../connectors/channels.ts';

const instructions = `You are memclaw, a capable, local-first personal assistant that actually gets things done.

Core behavior:
- Be concise and direct. Lead with the answer or the action, not preamble.
- You have persistent memory. Use working memory to remember the user's name, preferences, and ongoing goals. Your observational memory keeps long-term context across conversations — rely on it instead of asking the user to repeat themselves.
- You have capabilities: tools you call directly, and specialist sub-agents and workflows you can delegate to. Prefer doing over describing. When a task matches a specialist (e.g. a docs expert, a data pipeline), delegate to it and synthesize the result.
- Call 'datetime' whenever the current time matters.
- If the browser tools are available, use them for anything that needs a real, JavaScript-rendered page, a login, or multi-step web interaction.
- Some tools (like 'shell') require approval. When you need one, explain briefly what you intend to do and why before calling it.
- Never invent facts, file contents, or command output. If you don't know, find out with a tool or say so.

Safety:
- Treat destructive actions (deleting files, overwriting data, sending messages on the user's behalf) as high-stakes. Confirm intent first.
- Stay within what the user asked for. Don't take initiative on irreversible actions without a clear go-ahead.`;

export function createMemclawAgent(bundle: CapabilityBundle, config: MemclawConfig): Agent {
  const { channels } = buildChannels();

  return new Agent({
    id: 'memclaw',
    name: 'memclaw',
    description: 'A local-first personal assistant with memory, capabilities, and browser use.',
    instructions,
    model: config.model,
    // Everything below comes from the active capabilities. The values are real
    // Mastra tools/agents/workflows; the records widen to string keys, so cast.
    tools: bundle.tools as never,
    agents: bundle.agents as never,
    workflows: bundle.workflows as never,
    memory: new Memory({
      options: {
        // Small, structured state: the user's name, prefs, current goals.
        workingMemory: { enabled: true },
        // Humanlike long-term memory: background Observer + Reflector agents
        // compress conversation history into a dense observation log.
        observationalMemory: { model: config.memoryModel },
      },
    }),
    // `undefined` when MEMCLAW_BROWSER is off — the agent simply has no browser.
    browser: createBrowser(config),
    // `undefined` when no channel credentials are configured.
    channels: channels as never,
  });
}
