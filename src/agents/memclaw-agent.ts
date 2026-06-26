/**
 * The memclaw agent — one capable, memory-backed assistant wired to the full
 * Mastra stack: observational + working memory, a tool registry, an optional
 * real browser, and platform channels.
 */
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { config } from '../config.ts';
import { buildTools } from '../tools/index.ts';
import { createBrowser } from '../browser/index.ts';
import { buildChannels } from '../connectors/channels.ts';

const instructions = `You are memclaw, a capable, local-first personal assistant that actually gets things done.

Core behavior:
- Be concise and direct. Lead with the answer or the action, not preamble.
- You have persistent memory. Use working memory to remember the user's name, preferences, and ongoing goals. Your observational memory keeps long-term context across conversations — rely on it instead of asking the user to repeat themselves.
- You have tools. Prefer doing over describing: fetch the page, run the command, check the time. Call 'datetime' whenever the current time matters.
- If the browser tools are available, use them for anything that needs a real, JavaScript-rendered page, a login, or multi-step web interaction.
- Some tools (like 'shell') require approval. When you need one, explain briefly what you intend to do and why before calling it.
- Never invent facts, file contents, or command output. If you don't know, find out with a tool or say so.

Safety:
- Treat destructive actions (deleting files, overwriting data, sending messages on the user's behalf) as high-stakes. Confirm intent first.
- Stay within what the user asked for. Don't take initiative on irreversible actions without a clear go-ahead.`;

const { channels } = buildChannels();

export const memclawAgent = new Agent({
  id: 'memclaw',
  name: 'memclaw',
  description: 'A local-first personal assistant with memory, tools, and browser use.',
  instructions,
  model: config.model,
  // The registry widens to a string-keyed record (tools are added conditionally);
  // the values are real Mastra tools, so this is safe.
  tools: buildTools(config) as never,
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
