import { defineCapability } from '../types.ts';
import { webFetchTool } from './web-fetch-tool.ts';

export const webCapability = defineCapability({
  id: 'web',
  name: 'Web',
  description: 'Read content from the web over HTTP(S).',
  version: '0.1.0',
  author: 'memclaw',
  tools: { webFetch: webFetchTool },
});
