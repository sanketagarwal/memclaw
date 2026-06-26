# Capabilities — extend memclaw, contribute to the project

Capabilities are how memclaw grows. A **capability** is a small, self-contained
bundle that gives the agent new ways to get work done. It's memclaw's take on
"skills": anyone can write one, and shipping it is a folder or an npm package.

A capability can contribute any combination of:

- **tools** — functions the agent calls (fetch a page, query an API, edit a file)
- **agents** — specialist sub-agents the orchestrator delegates to (a docs expert,
  a research agent); Mastra exposes each to the orchestrator as a tool
- **workflows** — multi-step pipelines, also exposed to the agent as tools

Active capabilities are assembled into the agent at startup. **Adding abilities
never touches the agent code** — you ship a capability.

## See what's active

```bash
npm run caps      # or: memclaw caps
```

This lists each active capability, the tools/agents/workflows it contributes, and
the status of any environment variables it declares. Gated-off capabilities are
shown too, with the reason.

## Write a capability (the 4-step flow)

### 1. Copy the template

```bash
cp -r src/capabilities/_template src/capabilities/github
```

The template is a complete, commented example with an inline tool, an env
declaration, and an `enabled()` gate.

### 2. Define the manifest

`src/capabilities/github/index.ts`:

```typescript
import { defineCapability } from '../types.ts';
import { listReposTool } from './list-repos-tool.ts';

export const githubCapability = defineCapability({
  id: 'github',
  name: 'GitHub',
  description: 'Read repositories, issues, and PRs from GitHub.',
  version: '0.1.0',
  author: 'you',
  tools: { listRepos: listReposTool },
  env: [{ name: 'GITHUB_TOKEN', description: 'GitHub PAT', required: true }],
  enabled: () => Boolean(process.env.GITHUB_TOKEN),
});
```

Write your tool exactly like any Mastra tool (see the template's `example-tool.ts`
or [docs/tools-anatomy.md](#anatomy-of-a-tool) below).

### 3. Register it

Add it to the built-in registry in `src/capabilities/registry.ts`:

```typescript
import { githubCapability } from './github/index.ts';

export const builtinCapabilities: Capability[] = [
  // ...existing...
  githubCapability,
];
```

### 4. Verify

```bash
npm run typecheck
npm run caps        # your capability should appear
npm run chat        # try it
```

## Anatomy of a tool

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const myTool = createTool({
  id: 'my-tool',
  description: 'Explain WHEN the agent should use this — the model reads it.',
  inputSchema: z.object({ query: z.string().describe('What to do') }),
  outputSchema: z.object({ result: z.string() }),
  // For risky actions add `requireApproval: true` — on a channel it renders as
  // an Approve/Deny card. See src/capabilities/shell/shell-tool.ts.
  execute: async ({ query }) => ({ result: `did: ${query}` }),
});
```

`execute` receives the parsed input directly. Return data matching `outputSchema`.

## Delegating to a sub-agent

To wrap an existing Mastra agent (or a lifted template — see the templates note
below) as a capability, put it under `agents`:

```typescript
import { Agent } from '@mastra/core/agent';

const docsExpert = new Agent({
  id: 'docs-expert',
  description: 'Answers questions about our documentation using RAG.',
  model: 'openai/gpt-5-mini',
  tools: { /* ...the docs template's retrieval tool... */ },
});

export const docsCapability = defineCapability({
  id: 'docs',
  name: 'Docs Expert',
  description: 'Delegates documentation questions to a specialist.',
  agents: { docsExpert },
});
```

memclaw will call `docs-expert` when a question matches its `description`. This is
how you bring in Mastra **templates** (docs chatbot, chat-with-YT, feedback
summary): lift the template's agent or workflow into a capability and register it.

## Borrow tools from the whole ecosystem (MCP)

The fastest way to give memclaw *a lot* of tools is the built-in **`mcp`**
capability. Point it at any [Model Context Protocol](https://modelcontextprotocol.io)
server and the agent gains all of that server's tools — no code.

Create `memclaw.mcp.json` in the project root (copy `memclaw.mcp.json.example`):

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/you/allow"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
    }
  }
}
```

Then `npm run caps` (you'll see e.g. `filesystem_read_file`, `filesystem_write_file`,
…) and `npm run chat`. Tool names are namespaced `server_tool`, and every MCP tool
call is traced in Studio. Stdio servers use `command`/`args`; remote servers use a
`url`. The `mcp` capability activates automatically when the file exists.

> Hundreds of MCP servers exist (GitHub, Slack, Postgres, Notion, Brave Search,
> Puppeteer, and more). This is the single biggest lever for breadth.

## Ship it as an npm package (for the wider community)

Capabilities don't have to live in this repo. Publish one and anyone can use it:

1. Build an npm package whose default export is a `defineCapability(...)` (or an
   array of them):

   ```typescript
   // index.ts of your package
   import { defineCapability } from 'memclaw/capabilities'; // peer dep
   export default defineCapability({ id: 'notion', /* ... */ });
   ```

2. Users install and enable it:

   ```bash
   npm install memclaw-cap-notion
   # .env
   MEMCLAW_CAPABILITIES=memclaw-cap-notion
   ```

The loader imports each listed package, reads its `default` / `capability` /
`capabilities` export, and merges it in — same as a built-in. Name packages
`memclaw-cap-*` or `@scope/memclaw-*` so they're discoverable.

## Contributing back

Built-in capabilities are the fastest way to grow memclaw for everyone:

1. Add `src/capabilities/<id>/` and register it.
2. Add a row to [CAPABILITIES.md](../CAPABILITIES.md) (the catalog).
3. `npm run typecheck && npm run caps`, then open a PR.

Guidelines:
- One capability = one coherent area (github, calendar, notion, search…).
- Declare every env var in `env` so `doctor`/`caps` can report it.
- Gate on missing required config with `enabled()` — fail quiet, not loud.
- Mark destructive tools `requireApproval: true`.
- Keep secrets out of return values (the observability layer captures tool I/O).
