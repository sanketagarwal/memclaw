# Adding a tool

A tool is a capability the agent can call. memclaw tools are plain Mastra tools, so
adding one is a single file plus one line in the registry.

## 1. Write the tool

Create `src/tools/my-tool.ts`:

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const myTool = createTool({
  id: 'my-tool',
  description: 'Explain clearly WHEN the agent should use this — the model reads it.',
  inputSchema: z.object({
    query: z.string().describe('What to do'),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ query }) => {
    // ...do the work...
    return { result: `did: ${query}` };
  },
});
```

Notes:
- `execute` receives the **parsed input** directly (destructure it).
- The `description` and field `.describe()`s are the agent's only guide to using the
  tool well. Write them for a reader who can't see your code.
- For risky actions, add `requireApproval: true`. On a connected channel the call
  renders as an Approve/Deny card; see `src/tools/shell.ts`.

## 2. Register it

In `src/tools/index.ts`, import it and add it to `baseTools` (always on) or push it in
conditionally inside `buildTools` (gated by config):

```typescript
import { myTool } from './my-tool.ts';

const baseTools = {
  webFetch: webFetchTool,
  datetime: datetimeTool,
  weather: weatherTool,
  myTool,            // 👈
};
```

That's it — the agent picks it up on next start. Verify with `npm run doctor` and try
it in `npm run chat`.

## Tips

- Keep tools small and composable; let the agent chain them.
- Return structured data (matching `outputSchema`) rather than prose.
- Network/file/secret access in a tool is captured by observability — the
  `SensitiveDataFilter` redacts obvious secrets, but don't return raw credentials.
- Browser actions are **not** tools you write here — enable `MEMCLAW_BROWSER` and the
  browser provider contributes its own toolset.
