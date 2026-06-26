import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * A minimal tool. Copy this shape for your own.
 *
 * The `description` and each `.describe()` are how the model decides when and
 * how to call your tool — write them for a reader who can't see the code.
 */
export const exampleTool = createTool({
  id: 'example-greet',
  description: 'Greet someone by name. Replace this with something useful.',
  inputSchema: z.object({
    name: z.string().describe('Who to greet'),
  }),
  outputSchema: z.object({
    greeting: z.string(),
  }),
  execute: async ({ name }) => {
    return { greeting: `Hello, ${name}! 🐾` };
  },
});
