import { defineCapability } from '../types.ts';
import { shellTool } from './shell-tool.ts';

export const shellCapability = defineCapability({
  id: 'shell',
  name: 'Shell',
  description: 'Run shell commands on the host machine (approval-gated, opt-in).',
  version: '0.1.0',
  author: 'memclaw',
  tools: { shell: shellTool },
  // Dangerous — only active when explicitly enabled in config.
  enabled: (config) => config.enableShell,
});
