/**
 * The Chief-of-Staff team — memclaw's flagship multi-agent example.
 *
 * A chief-of-staff orchestrator that delegates to three narrow specialists:
 *   - analyst   → spreadsheet tools (reads a .xlsx/.csv, returns real numbers)
 *   - researcher→ a real browser + web-fetch (opens pages, gathers facts)
 *   - scribe    → a workspace (writes results into local files)
 *
 * The orchestrator holds the shared team memory; each specialist has its own.
 * Enabled with MEMCLAW_TEAM=true. When on, it's the agent the terminal/chat
 * drives, and all four agents register top-level so each is individually
 * observable in Studio (plus nested in the orchestrator's team trace).
 */
import type { Agent } from '@mastra/core/agent';
import type { MemclawConfig } from '../config.ts';
import { defineSpecialist, defineOrchestrator } from './team.ts';
import { createBrowser } from '../browser/index.ts';
import { createWorkspace } from '../workspace/index.ts';
import { sheetsFindTool, sheetsListTool, sheetReadTool, sheetSummaryTool } from '../capabilities/spreadsheet/tools.ts';
import { webFetchTool } from '../capabilities/web/web-fetch-tool.ts';
import { datetimeTool } from '../capabilities/time/datetime-tool.ts';

export interface Team {
  orchestrator: Agent;
  /** Specialists, keyed by id — registered top-level for per-agent observability. */
  specialists: Record<string, Agent>;
}

export function createChiefOfStaff(config: MemclawConfig): Team | undefined {
  if (!config.team) return undefined;

  const analyst = defineSpecialist({
    id: 'analyst',
    name: 'Analyst',
    description: 'Reads and analyzes spreadsheets (.xlsx/.csv): sheets, rows, and column statistics.',
    instructions:
      `You are a data analyst. Use the spreadsheet tools to read the file you are given and answer with concrete numbers — totals, per-category sums, the largest costs. Cite the actual figures; never estimate. If you are given a folder instead of a file (the local workspace is at "${config.workspaceDir}"), use spreadsheetFind to discover the spreadsheet files in it first.`,
    tools: {
      spreadsheetFind: sheetsFindTool,
      spreadsheetSheets: sheetsListTool,
      spreadsheetRead: sheetReadTool,
      spreadsheetSummary: sheetSummaryTool,
    },
  });

  const researcher = defineSpecialist({
    id: 'researcher',
    name: 'Researcher',
    description: 'Researches topics on the web with a real browser; returns concise, sourced findings.',
    instructions:
      'You are a researcher. Use the browser to open and read pages, and web-fetch for quick reads. Return concise, accurate findings with the URLs you used. Never invent facts.',
    tools: { webFetch: webFetchTool, datetime: datetimeTool },
    // Force a real browser for this specialist regardless of the global flag.
    browser: createBrowser({ ...config, browser: true }),
  });

  const scribe = defineSpecialist({
    id: 'scribe',
    name: 'Scribe',
    description: 'Writes results into files in the local workspace.',
    instructions:
      'You are a scribe. Write clear, well-structured documents into the workspace using the file tools. Read a file before overwriting it. File paths are relative to the workspace root — write "plan.md", never "workspace/plan.md". You can only produce text formats (markdown/plain text), not PDFs.',
    // Force a workspace for this specialist regardless of the global flag.
    // Ungated: approval prompts cannot round-trip through the orchestrator
    // (see WorkspaceOptions.gated), and this workspace only reaches ./workspace.
    workspace: createWorkspace({ ...config, workspace: true }, { gated: false }),
  });

  const orchestrator = defineOrchestrator({
    id: 'chief-of-staff',
    name: 'Chief of Staff',
    instructions: `You are a chief of staff coordinating a small team. You do NOT do the work yourself — you delegate:
- "analyst" for anything involving the spreadsheet or numbers.
- "researcher" for anything needing the web or a browser.
- "scribe" to write results into files.
Plan the request, delegate the right jobs (usually the analyst first, so its numbers inform the researcher), then synthesize one clear answer. Use your shared memory to remember the user's goals across sessions.

The user's files live in the local workspace directory at "${config.workspaceDir}". You cannot receive uploads and must NEVER ask the user to upload or paste a file — the analyst can list and read the spreadsheets in that directory itself; just tell it which folder or file to look at.`,
    agents: { analyst, researcher, scribe },
  });

  return { orchestrator, specialists: { analyst, researcher, scribe } };
}
