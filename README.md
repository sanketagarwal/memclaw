<div align="center">

# 🐾 memclaw

**Run a team of AI agents — an orchestrator that delegates to specialists, each with its own memory — fully observable. Open-source, local-first, built on the full [Mastra](https://mastra.ai) stack.**

*Status: v0.1 — a working foundation. Headline: **multi-agent teams with per-agent Observational Memory and full Studio observability**. Plus tools, MCP, browser, workspace, connectors, a proactive scheduler, and inbound webhooks — all wired and verified.*

</div>

---

**memclaw lets you run multiple AI agents that work as a team and remember.** An
**orchestrator** agent coordinates **specialist** agents: the orchestrator keeps the
**shared team memory** while each specialist keeps its **own private memory** — and
**every step is observable** live in Mastra Studio (who got delegated what, which tools
ran, how long each took, and the memory forming in real time).

It runs on your machine, talks to you in the terminal or on Telegram/Slack/Discord, can
browse the web and use real tools, and acts on a schedule or on external events. Think of
it as a personal-assistant *distribution* of the [Mastra](https://mastra.ai) framework —
inspired by [OpenClaw](https://openclaw.ai/) and [Hermes](https://www.turingpost.com/p/hermes),
betting on one thing they don't emphasize: **a team of agents you can actually watch think.**

## Table of contents

- [Quick start](#quick-start)
- [⭐ The core idea: multi-agent teams](#-the-core-idea-multi-agent-teams)
- [Build your own multi-agent system](#build-your-own-multi-agent-system)
- [Use cases](#use-cases)
- [How it compares — memclaw vs OpenClaw vs Hermes](#how-it-compares--memclaw-vs-openclaw-vs-hermes)
- [Run every feature](#run-every-feature) ← **how to use each part**
  - [Chat](#1-chat-in-your-terminal) · [Memory](#2-memory-that-remembers-across-tasks) ·
    [Capabilities](#3-capabilities-give-the-agent-tools) · [MCP](#4-mcp--borrow-tools-from-the-whole-ecosystem) ·
    [Browser](#5-browser-use) · [Channels](#6-connectors--channels) · [Observability](#7-observability--mastra-studio) ·
    [Workspace](#8-workspace--local-files--shell) · [24/7 proactive](#9-24--7-proactive-runs-scheduler) ·
    [Inbound events](#10-inbound-external-events-webhooks) · [Multi-agent teams](#11-multi-agent-teams)
- [Configuration](#configuration)
- [Commands](#commands)
- [Architecture](#architecture)
- [Roadmap](#roadmap) · [Contributing](#contributing) · [License](#license)

## Quick start

> Requires **Node 20+** and an OpenAI API key.

```bash
git clone https://github.com/sanketagarwal/memclaw.git
cd memclaw
npm install
npm run setup     # writes .env, asks for your OpenAI key
npm run chat      # start talking in your terminal
```

Then, to see everything under the hood:

```bash
npm run dev       # opens Mastra Studio: traces, memory, metrics, screencast
```

## ⭐ The core idea: multi-agent teams

memclaw's headline feature: **build a team of AI agents that work together and remember.**

- An **orchestrator** agent takes a request and **delegates** to specialist agents, then synthesizes their results.
- The **orchestrator holds the shared team memory** — it accumulates the whole job and, across sessions, your ongoing context.
- **Each specialist keeps its own private memory** — Mastra isolates it (a fresh thread per delegation), so specialists stay focused and never pollute one another.
- **The whole thing is observable** — open Mastra Studio and watch the delegation unfold in the trace tree: the orchestrator calling each specialist, every tool call and timing, and each agent's Observational Memory forming live.

It's built on Mastra's supervisor pattern + Observational Memory + Studio, assembled so you can stand up an *observable* agent team in a few lines.

```bash
MEMCLAW_TEAM=true npm run dev    # registers the example "research-team" → http://localhost:4111
```

## Build your own multi-agent system

Four steps (full guide: [docs/multi-agent.md](docs/multi-agent.md)).

**1 — Define your specialists.** Each is a focused agent with a `description` (so the orchestrator knows when to use it), instructions, tools, and its own memory:

```typescript
import { defineSpecialist } from './src/team';
import { webFetchTool } from './src/capabilities/web/web-fetch-tool.ts';

const researcher = defineSpecialist({
  id: 'researcher',
  description: 'Gathers facts from the web and returns sourced bullet points.',
  instructions: 'Research topics with web-fetch. Never invent facts.',
  tools: { webFetch: webFetchTool },
});

const writer = defineSpecialist({
  id: 'writer',
  description: 'Turns research notes into a clear written answer.',
  instructions: 'Write clear prose from the given notes. Add nothing new.',
});
```

**2 — Define the orchestrator.** It manages the specialists and holds the shared memory:

```typescript
import { defineOrchestrator } from './src/team';

export const researchTeam = defineOrchestrator({
  id: 'research-team',
  instructions: 'Delegate fact-finding to researcher, then writing to writer; synthesize.',
  agents: { researcher, writer },      // ← the specialists it manages
});
```

**3 — Register it** in `src/mastra/index.ts`:

```typescript
const agents = { memclaw: memclawAgent, researchTeam };
export const mastra = new Mastra({ agents, /* ... */ });
```

**4 — Run + watch it.** Call the orchestrator; it delegates automatically, and you watch every hop in Studio:

```typescript
const team = mastra.getAgent('research-team');
await team.generate('Research X and write a short brief.', { memory: { thread: 't1', resource: 'me' } });
```

**Memory model at a glance:**

| | scope | holds |
| --- | --- | --- |
| **Orchestrator** | shared (resource — across sessions) | the whole job + your ongoing context |
| **Each specialist** | individual (fresh per delegation) | just its own task input/output |

## Use cases

What you can build by combining a team with the right tools and surfaces — all **observable end-to-end** in Studio:

- **Research team** — orchestrator → researcher (web/browser) + writer. *(multi-agent + browser)*
- **Personal chief-of-staff** — remembers your goals, DMs you a morning digest. *(memory + scheduler + Telegram)*
- **Inbox triage** — reads mail, drafts replies from what it knows about each client, you approve. *(MCP/email + memory + approval)*
- **Repo watchdog** — *"watch acme/repo"*; on a new issue a specialist reads your docs and drafts a reply. *(webhooks + workspace + delegation)*
- **Ops monitor** — reacts to alert webhooks, investigates, pings you. *(webhooks + proactive + delivery)*
- **Customer-support agent** — answers in Slack from your knowledge base. *(channels + docs specialist)*
- **Content pipeline** — researcher → writer → editor, each with its own memory. *(multi-agent)*
- **Data analyst** — reads a spreadsheet, a researcher adds context, a writer reports. *(spreadsheet + team)*
- **Dev helper** — reads/edits files and runs commands (approval-gated); a reviewer specialist checks the diff. *(workspace + team)*

Adding a new tool (capability or MCP) or a new specialist never touches the core.

## How it compares — memclaw vs OpenClaw vs Hermes

All three are self-hosted, persistent personal-agent projects. Honestly:

| | 🐾 **memclaw** | OpenClaw | Hermes |
| --- | --- | --- | --- |
| **Maturity** | v0.1 foundation | mature, large community | ~110k★ in 10 weeks, fast-growing |
| **Core bet** | observable multi-agent teams on Mastra | control-plane gateway + human-authored skills | self-improving single-agent loop |
| **Multi-agent** | ✅ orchestrator + specialists, per-agent memory | limited | primarily one self-improving agent |
| **Memory** | Observational Memory (Observer/Reflector); shared vs individual | persistent memory | self-curated memory |
| **Observability** | ✅ first-class — live traces, metrics, memory view, inspectable bus | logs | logs |
| **Extending** | capabilities (folder/npm) **+ MCP** (hundreds, config-only) | skills + 50+ integrations | self-authoring skills |
| **Self-authoring skills** | ❌ (roadmap) | partial | ✅ signature feature |
| **Connectors** | terminal, Telegram/Slack/Discord | WhatsApp/Telegram/Discord/Slack/Signal/iMessage (50+) | many messaging apps |
| **Stack** | TypeScript on Mastra, fully hackable | — | — |
| **Best for** | an observable agent *team* you own & extend | broad ready-made automation *today* | autonomous long-horizon knowledge work |

**The honest take:** OpenClaw and Hermes are mature, with large ecosystems — and Hermes has self-authoring skills memclaw doesn't (yet). memclaw's distinct edge is **observable multi-agent teams with a clean shared-vs-individual memory split**, standing on a maintained framework (Mastra) rather than a single project's runtime. Choose memclaw when you want to **build and *watch*** your own agent team; choose the others for breadth and maturity right now.

*Sources: [The New Stack](https://thenewstack.io/persistent-ai-agents-compared/) · [Turing Post](https://www.turingpost.com/p/hermes) · [MindStudio](https://www.mindstudio.ai/blog/hermes-agent-vs-openclaw-comparison).*

---

## Run every feature

Each feature below is independent and has a copy-paste path.

### 1. Chat in your terminal

The zero-config surface. Works the moment you install.

```bash
npm run chat
# > what can you do?
# > /exit to quit
```

Under the hood your message is published to the event bus, the dispatcher runs the
agent, and the reply comes back over the bus — the same path every other connector uses.

### 2. Memory that remembers across tasks

memclaw has two memory systems, both on by default — no setup.

- **Working memory** — small structured state (your name, preferences, current goals).
- **Observational Memory (OM)** — background **Observer** and **Reflector** agents watch
  your conversations and maintain a dense, compressed "observation log" that replaces raw
  history as it grows. This is what lets memclaw stay coherent over long sessions without
  context rot, and remember you over time.

**Does it maintain context across multiple different tasks? Yes — here's how:**

- **Within a task** (one conversation/thread), memclaw keeps full recent history *plus*
  the observation log, so it never loses the thread of what you're doing.
- **Across tasks**, memory is keyed by a **thread** (the conversation) and a **resource**
  (you, stable across conversations). Working-memory facts and observations attributed to
  your resource carry forward, so a new conversation already knows your name, preferences,
  and the projects you've mentioned — you don't repeat yourself.
- For deeper **cross-conversation continuity** (observations shared across *all* your
  threads), enable OM **resource scope** in `src/agents/memclaw-agent.ts`:

  ```typescript
  observationalMemory: { model: config.memoryModel, scope: 'resource' }
  ```

  (Resource scope is powerful but marked experimental upstream — great for a single user's
  long-running assistant; read the [OM docs](https://mastra.ai/docs/memory/observational-memory).)

**See it working:** run `npm run dev`, open the agent, and use the **Memory** tab — live
token bars for messages vs. observations, the current observation log, and background
Observer/Reflector status as you chat.

### 3. Capabilities (give the agent tools)

Everything the agent can do is a **capability** — a self-contained bundle of tools,
specialist sub-agents, and/or workflows.

```bash
npm run caps      # list active capabilities, their tools, and env status
```

Built-in: `time`, `web`, `weather`, `spreadsheet` (analyze local Excel/CSV), and `mcp`.
(Local filesystem + shell is the **Workspace** feature — see [§8](#8-workspace--local-files--shell).)
**Add your own** in four steps (full guide:
[docs/capabilities.md](docs/capabilities.md)):

```bash
cp -r src/capabilities/_template src/capabilities/github   # 1. copy the template
# 2. edit index.ts (manifest) + write your tool
# 3. register it in src/capabilities/registry.ts
npm run caps                                                # 4. verify it loads
```

Capabilities can also be **published as npm packages** and enabled with one env var
(`MEMCLAW_CAPABILITIES=memclaw-cap-notion`) — so people extend memclaw without forking it.
See the [catalog](CAPABILITIES.md).

### 4. MCP — borrow tools from the whole ecosystem

The fastest way to give memclaw *a lot* of tools. Point the built-in `mcp` capability at
any [Model Context Protocol](https://modelcontextprotocol.io) server (GitHub, filesystem,
Postgres, Notion, Slack, Brave Search, … hundreds exist) and the agent gains all of its
tools — **no code**.

```bash
cp memclaw.mcp.json.example memclaw.mcp.json
# edit it — e.g. the filesystem server:
```
```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/you/allow"]
    }
  }
}
```
```bash
npm run caps      # MCP now active: filesystem_read_file, filesystem_write_file, …
npm run chat      # "list the files in that folder and summarize the largest one"
```

Tool names are namespaced `server_tool`, and every MCP call is traced in Studio like any
other tool. Stdio servers use `command`/`args`; remote servers use a `url`.

### 5. Browser use

Give the agent a real Playwright browser with accessibility-first targeting and a **live
screencast in Studio**.

```bash
# in .env:  MEMCLAW_BROWSER=true
npx playwright install chromium      # one-time
npm run dev                          # watch the agent browse in Studio
```

The agent automatically receives the browser's toolset (navigate, click, type, read).

### 6. Connectors / channels

The terminal works out of the box. Add a platform by putting its credentials in `.env`
(full guide: [docs/connectors.md](docs/connectors.md)):

- **Telegram** — long-polling, **no public URL needed**. Set `TELEGRAM_BOT_TOKEN`, run
  `npm run dev`, message your bot.
- **Slack / Discord** — webhooks. Set their tokens, run `npm run dev`, and tunnel it
  (`npx cloudflared tunnel --url http://localhost:4111`); point the platform webhook at
  `/api/agents/memclaw/channels/{platform}/webhook`.

A channel is enabled only when its credentials are present, so an empty `.env` starts clean.

### 7. Observability — Mastra Studio

This is the part that makes memclaw auditable. Observability is **storage-backed**: every
agent run, tool call (including MCP and spreadsheet), memory operation, and bus event is
written to storage as a trace; Studio reads from that storage.

**Local — just open Studio:**

```bash
npm run dev          # http://localhost:4111
```

Studio gives you three views (all powered by the LibSQL + DuckDB stores memclaw configures):

- **Traces** — per request: model calls, tool executions, timings, inputs/outputs.
- **Metrics** — runs, model cost, token usage, latency p50/p95 over time.
- **Logs** — searchable, correlated to traces.

Plus the live **event-bus metrics**:

```bash
curl http://localhost:4111/memclaw/bus     # per-topic counts, throughput, avg latency
```

**Deployed — what's the flow?** You don't keep `mastra dev` running in production; instead
you point observability at durable storage and view it one of these ways:

1. **Mastra Platform (hosted)** — add `MastraPlatformExporter()` to the observability
   config in `src/mastra/index.ts` and set `MASTRA_PLATFORM_ACCESS_TOKEN`. Traces/logs/
   metrics flow to Mastra Cloud across deploys. *(memclaw ships with this exporter commented
   out so local runs need no token.)*
2. **Your own stack** — Mastra has OTel and Datadog tracing bridges; export spans to whatever
   you already run.
3. **Self-host Studio** — keep a durable store (use **Postgres** for metrics — plain
   relational/in-memory stores don't support the metrics OLAP) and run Studio against it.

So the short answer: **locally, just `npm run dev`.** Deployed, pick a durable store + an
exporter (hosted, OTel/Datadog, or self-hosted Studio) and your traces are there.

### 8. Workspace — local files + shell

Give the agent a real local environment (Mastra's **Workspace**): file tools
(read/write/edit/list/grep) and a sandbox to run commands, rooted at a directory.

```bash
# in .env:
MEMCLAW_WORKSPACE=true
MEMCLAW_WORKSPACE_DIR=./workspace
npm run chat     # "create notes.md in the workspace and write today's plan into it"
```

It's safer than a raw shell tool: **writes, deletes, and commands require approval**,
and **writes require reading the file first** (with stale-file detection). Every call is
traced in Studio. This is the recommended way to give memclaw the filesystem — for files
on a *remote* host, use an MCP server instead (§4).

### 9. 24 / 7 proactive runs (scheduler)

memclaw can act on its own on a schedule — not just when messaged. This uses Mastra's
**built-in scheduled workflows**: a cron-fired workflow runs the agent and publishes the
result to the bus.

```bash
# in .env:
MEMCLAW_SCHEDULE=true
MEMCLAW_SCHEDULE_CRON=0 8 * * *                  # 8am daily
# MEMCLAW_SCHEDULE_PROMPT=Summarize my unread email and message me
# Deliver the result straight to a chat (else it stays bus-only):
MEMCLAW_SCHEDULE_DELIVER_TO=telegram:123456789   # or slack:C0123ABCD
npm run start                                    # run as a long-lived process (pm2/systemd)
```

**Delivery** sends the run's output to a chat via that platform's send API, so a proactive
digest actually arrives in your DMs. It needs the matching bot token (`TELEGRAM_BOT_TOKEN`
/ `SLACK_BOT_TOKEN`). To find your Telegram chat id: message your bot, then open
`https://api.telegram.org/bot<token>/getUpdates` and read `result[].message.chat.id`.
Without `DELIVER_TO`, results stay on the bus (still observable in Studio).

The schedule appears in Studio's **Schedules** view (`/workflows/schedules`) with next
fire time, run history, and **pause/resume** — no redeploy needed. Combined with running
memclaw as a persistent daemon, this is genuine always-on, autonomous operation.

> The built-in scheduler is a tick loop that needs a **long-lived host process** (your
> server, Fly, Railway, ECS, a container). It won't fire on serverless — use
> [`@mastra/inngest`](https://mastra.ai/docs/workflows/scheduled-workflows) there.

### 10. Inbound external events (webhooks)

The inbound counterpart to the bus: external systems (GitHub, Stripe, a CRM, sensors…)
POST a webhook and it becomes a **notification signal** injected into a subscribed
conversation — via Mastra's `WebhookSignalProvider`. A single thread can hold your
messages *and* events from multiple sources, with no restart and no lost prompt cache.

```bash
# .env
MEMCLAW_WEBHOOKS=true
npm run dev                                   # mounts POST /webhooks/:source
npx cloudflared tunnel --url http://localhost:4111   # public URL for real providers
```

Binding a conversation is **conversational** — the agent has `watch-source` /
`unwatch-source` tools, so you just say *"watch acme/repo in this chat"* and its events
arrive here as notifications. Every event is also mirrored onto the bus
(`memclaw.event.external`), so it's visible in the monitor and Studio even before any
subscription. See [docs/webhooks.md](docs/webhooks.md). (Verified end-to-end: watch →
webhook → `matched:1` → unwatch → `matched:0`.)

### 11. Multi-agent teams

memclaw's headline feature — covered in full above:
[⭐ The core idea](#-the-core-idea-multi-agent-teams) and
[Build your own multi-agent system](#build-your-own-multi-agent-system). Quick enable:

```bash
MEMCLAW_TEAM=true npm run dev    # registers the example "research-team"
```

(Verified: `mastra dev` boots and registers both `memclaw` and `research-team`.)
Delegation is hub-and-spoke; for peer-to-peer/cross-service agents, Mastra has a
separate A2A protocol.

---

## Configuration

All configuration is via `.env` (start from [`.env.example`](.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Model provider key (required) |
| `MEMCLAW_MODEL` | `openai/gpt-5-mini` | Agent model (`provider/model`) |
| `MEMCLAW_MEMORY_MODEL` | `openai/gpt-5-mini` | Observer/Reflector model |
| `MEMCLAW_PUBSUB` | `memory` | Bus backend: `memory` \| `unix` \| `redis` |
| `MEMCLAW_BROWSER` | `false` | Enable the Playwright browser |
| `MEMCLAW_WORKSPACE` | `false` | Local filesystem + shell (approval-gated) |
| `MEMCLAW_WORKSPACE_DIR` | `./workspace` | Workspace root directory |
| `MEMCLAW_SCHEDULE` | `false` | Enable the proactive cron run |
| `MEMCLAW_SCHEDULE_CRON` | `0 8 * * *` | Cron for the proactive run |
| `MEMCLAW_WEBHOOKS` | `false` | Accept inbound webhooks as agent signals |
| `MEMCLAW_TEAM` | `false` | Register the example multi-agent research team |
| `MEMCLAW_CAPABILITIES` | — | Comma-separated external capability packages |
| `MEMCLAW_MCP_CONFIG` | `memclaw.mcp.json` | Path to the MCP servers file |
| `TELEGRAM_BOT_TOKEN` | — | Enable the Telegram channel |
| `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET` | — | Enable the Slack channel |
| `DISCORD_BOT_TOKEN` / `DISCORD_PUBLIC_KEY` | — | Enable the Discord channel |

### Scaling the bus

The same code runs on every backend — flip one env var:

- `memory` — in-process + replay cache. Zero infra. (default)
- `unix` — share the bus across processes on one host via a Unix socket.
- `redis` — distributed across hosts (`npm i @mastra/redis-streams`, set `REDIS_URL`).

## Commands

| Command | What it does |
| --- | --- |
| `npm run setup` | Interactive `.env` setup |
| `npm run chat` | Talk to memclaw in the terminal |
| `npm run start` | Run the bus runtime (dispatcher + connectors + monitor) |
| `npm run dev` | Launch Mastra Studio |
| `npm run caps` | List active capabilities |
| `npm run doctor` | Verify configuration |
| `npm run build` | Production build (`mastra build`) |

## Architecture

Everything is wired through one event bus; connectors publish to it and the dispatcher
runs the agent. That decoupling is what makes the system observable and extensible. Full
tour: [docs/architecture.md](docs/architecture.md).

```
   ┌──────────┐     inbound      ┌────────────┐    generate()   ┌──────────────┐
   │ Connector│ ───────────────▶ │ Dispatcher │ ──────────────▶ │ memclaw Agent│
   │ cli /    │                  │            │                 │ • memory     │
   │ telegram │ ◀─────────────── │            │ ◀────────────── │ • capabilities│
   │ slack …  │     outbound     └────────────┘     reply       │ • MCP/browser│
   └──────────┘          │                                      └──────────────┘
                         ▼  (every event)
                  ┌──────────────┐   GET /memclaw/bus  +  Mastra Studio traces
                  │  Bus Monitor │ ─────────────────────────────────────────────▶
                  └──────────────┘
```

## Roadmap

- [ ] Self-authoring capabilities (agent writes its own tools)
- [ ] More connectors: WhatsApp, Signal, iMessage, email, web widget
- [ ] More built-in capabilities: GitHub, calendar, search (see [Wanted](CAPABILITIES.md#wanted))
- [x] Local filesystem + shell via Mastra Workspace
- [x] Scheduled / proactive 24·7 runs via Mastra scheduled workflows
- [x] Inbound external events via Mastra webhook signals
- [x] Conversational webhook subscribe/unsubscribe ("watch acme/repo in this chat")
- [x] Multi-agent teams — orchestrator + specialists, shared vs individual memory
- [ ] Self-authoring skills (agent writes its own capabilities)
- [ ] Deliver proactive results straight to a chosen connector (Telegram DM, etc.)
- [ ] One-line installer (`npm create memclaw`)

## Contributing

The fastest way to grow memclaw is a **capability** — ship a folder or an npm package.
See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/capabilities.md](docs/capabilities.md), and
the [catalog](CAPABILITIES.md).

## License

[MIT](LICENSE) © memclaw contributors. Built on [Mastra](https://mastra.ai).
