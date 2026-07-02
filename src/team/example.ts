/**
 * A worked example: a research team orchestrator managing two specialists.
 * Copy this to build your own team. Enabled with MEMCLAW_TEAM=true, then it's
 * registered as the `research-team` agent (visible + callable in Studio).
 */
import type { Agent } from '@mastra/core/agent';
import type { MemclawConfig } from '../config.ts';
import { defineSpecialist, defineOrchestrator } from './team.ts';
import { webFetchTool } from '../capabilities/web/web-fetch-tool.ts';
import { datetimeTool } from '../capabilities/time/datetime-tool.ts';

export function createResearchTeam(config: MemclawConfig): Agent | undefined {
  if (!config.team) return undefined;

  // Specialist 1 — has web tools, gathers facts. Its own individual memory.
  const researcher = defineSpecialist({
    id: 'researcher',
    description: 'Gathers facts from the web and returns concise, sourced bullet points.',
    instructions:
      'You research topics. Use web-fetch to read sources and datetime when recency matters. Return concise, accurate bullet points with the URLs you used. Never invent facts.',
    tools: { webFetch: webFetchTool, datetime: datetimeTool },
  });

  // Specialist 2 — turns notes into prose. Its own individual memory.
  const writer = defineSpecialist({
    id: 'writer',
    description: 'Turns research notes into a clear, well-structured written answer.',
    instructions:
      'You are a writer. Given research notes, produce a clear, well-structured answer in full prose. Do not add facts beyond the notes.',
  });

  // Orchestrator — manages the two, holds the shared team memory.
  return defineOrchestrator({
    id: 'research-team',
    name: 'Research Team',
    instructions: `You coordinate a research team. For a user request:
1. Delegate fact-gathering to "researcher".
2. Delegate writing the final answer to "writer", passing the researcher's notes.
Then synthesize and return the result. Use your memory to remember the user's interests across sessions.`,
    agents: { researcher, writer },
  });
}
