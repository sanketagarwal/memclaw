/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Capability template — copy this folder to build your own.                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * To create a capability:
 *   1. Copy `src/capabilities/_template/` to `src/capabilities/<your-id>/`.
 *   2. Edit the manifest below and write your tools / sub-agents / workflows.
 *   3. Register it in `src/capabilities/registry.ts`.
 *   4. Run `npm run caps` to confirm it loads.
 *
 * This template is NOT registered, so it never affects a real install — it only
 * exists as a starting point. Full guide: docs/capabilities.md.
 */
import { defineCapability } from '../types.ts';
import { exampleTool } from './example-tool.ts';

export const templateCapability = defineCapability({
  id: 'template',
  name: 'Template',
  description: 'A starting point for new capabilities. Copy me.',
  version: '0.1.0',
  author: 'your-name',
  homepage: 'https://github.com/your/repo',

  // Functions the agent can call directly.
  tools: {
    exampleGreet: exampleTool,
  },

  // Specialist sub-agents the orchestrator can delegate to (optional).
  // agents: { myExpert: myExpertAgent },

  // Multi-step pipelines, exposed to the agent as tools (optional).
  // workflows: { myPipeline: myWorkflow },

  // Declare any env vars you read, so `memclaw doctor` / `caps` can show status.
  env: [
    { name: 'EXAMPLE_API_KEY', description: 'Example third-party key', required: false },
  ],

  // Optional gate. Return false to keep this capability out of the agent — e.g.
  // when a required key is missing. Remove it to always be on.
  enabled: () => Boolean(process.env.EXAMPLE_API_KEY),
});
