/**
 * Tool registry.
 *
 * This is the one place to register a new capability for the agent. Add your
 * `createTool(...)` export to the `registry` below (or push it in conditionally
 * based on config) and the agent picks it up automatically. See docs/tools.md.
 */
import type { MemclawConfig } from '../config.ts';
import { webFetchTool } from './web-fetch.ts';
import { datetimeTool } from './datetime.ts';
import { shellTool } from './shell.ts';
import { weatherTool } from './weather-tool.ts';

// Tools that are always available.
const baseTools = {
  webFetch: webFetchTool,
  datetime: datetimeTool,
  weather: weatherTool,
};

/**
 * Build the toolset for the agent, honoring config gates (e.g. shell access).
 * Browser tools are NOT added here — they come from the `browser` provider
 * assigned on the agent, which contributes its own toolset.
 */
export function buildTools(config: MemclawConfig): Record<string, unknown> {
  const tools: Record<string, unknown> = { ...baseTools };
  if (config.enableShell) {
    tools.shell = shellTool;
  }
  return tools;
}

export { webFetchTool, datetimeTool, shellTool, weatherTool };
