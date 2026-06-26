/**
 * Optional browser provider.
 *
 * When `MEMCLAW_BROWSER=true`, the agent gets a real Playwright-backed browser
 * with accessibility-first targeting. Mastra contributes the browser's toolset
 * to the agent automatically and streams a live screencast into Studio, so you
 * can watch the agent click through pages in real time.
 *
 * Run `npx playwright install chromium` once before enabling.
 */
import { AgentBrowser } from '@mastra/agent-browser';
import type { MemclawConfig } from '../config.ts';

export function createBrowser(config: MemclawConfig): AgentBrowser | undefined {
  if (!config.browser) return undefined;
  return new AgentBrowser({ headless: config.browserHeadless });
}
