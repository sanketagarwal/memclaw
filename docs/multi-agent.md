# Building a multi-agent system

memclaw ships a small method for building **orchestrated agent teams**: one
orchestrator (a supervisor) that manages and delegates to multiple specialist
agents. It's built on Mastra's supervisor pattern, with a memory model that
matches how teams should work:

- **Orchestrator → shared team memory.** The orchestrator's memory accumulates the
  whole coordination — your request, each delegation, each result — and (with
  resource scope) persists across conversations.
- **Specialists → individual memory.** Each specialist has its own memory. Mastra
  isolates it: only that specialist's delegation prompt + response are saved, on a
  fresh thread per invocation. Specialists never see each other's memory.

## The building blocks

Two helpers from `src/team`:

### `defineSpecialist(spec)` — a focused worker

```typescript
import { defineSpecialist } from '../team/index.ts';
import { webFetchTool } from '../capabilities/web/web-fetch-tool.ts';

const researcher = defineSpecialist({
  id: 'researcher',
  description: 'Gathers facts from the web and returns sourced bullet points.', // the orchestrator reads this to decide when to delegate here
  instructions: 'You research topics. Use web-fetch to read sources. Never invent facts.',
  tools: { webFetch: webFetchTool },
  // memoryScope: 'thread' (default) — individual memory
});
```

### `defineOrchestrator(spec)` — the supervisor

```typescript
import { defineOrchestrator } from '../team/index.ts';

export const researchTeam = defineOrchestrator({
  id: 'research-team',
  instructions: `Coordinate the team: delegate fact-finding to "researcher", then
  writing to "writer", and synthesize the result.`,
  agents: { researcher, writer },
  // memoryScope: 'resource' (default) — shared team memory across sessions
});
```

`description` is **required** on specialists — it's how the orchestrator's model
knows who to delegate to.

## Register and call it

An orchestrator is a normal Mastra `Agent`. Add it to the Mastra instance and call
it — it delegates automatically:

```typescript
// src/mastra/index.ts
const agents: Record<string, Agent> = { memclaw: memclawAgent };
agents.researchTeam = researchTeam;      // register your orchestrator
export const mastra = new Mastra({ agents, /* ... */ });
```

```typescript
const team = mastra.getAgent('research-team');
const res = await team.generate('Research the latest on X and write a short brief.', {
  memory: { thread: 'brief-1', resource: 'user-1' },
});
// The orchestrator delegates to researcher → writer, then returns the synthesis.
```

## Try the shipped example

memclaw includes a working example (`src/team/chief-of-staff.ts`): a `chief-of-staff`
orchestrator managing three specialists — **analyst** (spreadsheet tools),
**researcher** (a real browser + web), and **scribe** (workspace files). Turn it on:

```bash
# .env
MEMCLAW_TEAM=true
npm run dev      # chief-of-staff + analyst/researcher/scribe appear in Studio
```

When enabled, the terminal/chat (`npm run chat`) drives the orchestrator, and **all four
agents register top-level** — so in Studio you get both the **overall team trace**
(delegation nested under `chief-of-staff`) and a **per-agent view** for each specialist
(its own runs and its own memory).

## Notes

- **Delegation, not free chat.** The orchestrator calls specialists and reads their
  results (hub-and-spoke). For peer-to-peer or cross-service agents, Mastra has a
  separate A2A protocol.
- **Nest capabilities.** Specialists take the same tools as any capability, and you
  can lift a Mastra template's agent in as a specialist.
- **Cost.** Each delegation is a model call — an orchestrator + 2 specialists is
  several calls per request. Keep specialists on fast models where you can.
