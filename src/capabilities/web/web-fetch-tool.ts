import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Fetch a URL and return its text content. A lightweight way for the agent to
 * read the web without a full browser. For interactive pages, enable the
 * browser (`MEMCLAW_BROWSER=true`) instead.
 */
export const webFetchTool = createTool({
  id: 'web-fetch',
  description:
    'Fetch a URL over HTTP(S) and return its text content. Use for reading articles, docs, or APIs. For pages that need JavaScript or a login, use the browser tools instead.',
  inputSchema: z.object({
    url: z.string().url().describe('The absolute URL to fetch'),
    maxChars: z
      .number()
      .int()
      .positive()
      .max(100_000)
      .default(8_000)
      .describe('Truncate the returned body to this many characters'),
  }),
  outputSchema: z.object({
    url: z.string(),
    status: z.number(),
    contentType: z.string(),
    truncated: z.boolean(),
    text: z.string(),
  }),
  execute: async ({ url, maxChars }) => {
    const limit = maxChars ?? 8_000;
    const res = await fetch(url, {
      headers: { 'user-agent': 'memclaw/0.1 (+https://github.com/)' },
      redirect: 'follow',
    });
    const contentType = res.headers.get('content-type') ?? 'unknown';
    const body = await res.text();
    const truncated = body.length > limit;
    return {
      url: res.url,
      status: res.status,
      contentType,
      truncated,
      text: truncated ? body.slice(0, limit) : body,
    };
  },
});
