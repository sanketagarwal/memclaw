import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Gives the agent an accurate sense of "now". LLMs don't know the current time,
 * so this small tool prevents a whole class of scheduling/recency mistakes.
 */
export const datetimeTool = createTool({
  id: 'datetime',
  description: 'Get the current date and time on the machine running memclaw.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    iso: z.string(),
    unix: z.number(),
    timezone: z.string(),
    human: z.string(),
  }),
  execute: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      human: now.toString(),
    };
  },
});
