<div align="center">

# 🐾 memclaw

**An open-source, local-first personal AI agent built on the full [Mastra](https://mastra.ai) stack.**

</div>

---

memclaw is a personal AI assistant that runs on your machine, remembers you across
conversations, can browse the web and run real tools, and talks to you wherever you
are — your terminal today, Telegram/Slack/Discord with one line of config. Every
message flows over an **event bus**, and every action is **traced in Mastra Studio**,
so the whole system is observable instead of a black box.

It's inspired by [OpenClaw](https://openclaw.ai/), but takes a different bet: instead
of hand-rolling memory, browser control, integrations, and eventing, memclaw stands on
Mastra's batteries-included agent framework — and exposes all of it.

## Table of contents

- [Quick start](#quick-start)
- [Why memclaw?](#why-memclaw)
- [Run every feature](#run-every-feature) ← **how to use each part**
  - [Chat](#1-chat-in-your-terminal) · [Memory](#2-memory-that-remembers-across-tasks) ·
    [Capabilities](#3-capabilities-give-the-agent-tools) · [MCP](#4-mcp--borrow-tools-from-the-whole-ecosystem) ·
    [Browser](#5-browser-use) · [Channels](#6-connectors--channels) · [Observability](#7-observability--mastra-studio) ·
    [Workspace](#8-workspace--local-files--shell) · [24/7 proactive](#9-24--7-proactive-runs-scheduler) ·
    [Inbound events](#10-inbound-external-events-webhooks)
- [Configuration](#configuration)
- [Commands](#commands)
- [Architecture](#architecture)
- [Roadmap](#roadmap) · [Contributing](#contributing) · [License](#license)

## Quick start

> Requires **Node 20+** and an OpenAI API key.

```bash
git clone https://github.com/USER/memclaw.git
cd memclaw
npm install
npm run setup     # writes .env, asks for your OpenAI key
npm run chat      # start talking in your terminal
```

Then, to see everything under the hood:

```bash
npm run dev       # opens Mastra Studio: traces, memory, metrics, screencast
```

## Why memclaw?

memclaw's bet is **architecture over accretion**. Because it's built on Mastra, the
hard parts — long-term memory, browser automation, integrations, tracing, and a
distributed-capable event bus — are first-class and *visible*, not bolted on.

| | 🐾 **memclaw** | OpenClaw |
| --- | --- | --- |
| **Memory** | [Observational Memory](https://mastra.ai/docs/memory/observational-memory): background Observer + Reflector agents compress history into a dense log, plus structured working memory | Persistent memory |
| **Observability** | **First-class.** Every run, tool call, and bus event is traced/metered. Watch it live in Mastra Studio | Logs |
| **Tools** | A **capability system** (ship a folder or npm package) **+ MCP** (any of hundreds of MCP servers, config-only) | Skills + integrations |
| **Event bus** | **Built in and inspectable.** Pub/sub with replay; scale in-process → Unix socket → Redis by changing one env var | — |
| **Browser** | Real Playwright browser with a **live screencast in Studio** | Browser automation |
| **Connectors** | Native Mastra channels: Telegram (no tunnel), Slack, Discord — add by dropping credentials in `.env` | WhatsApp, Telegram, Discord, Slack, Signal, iMessage |
| **Stack** | TypeScript, fully typed, hackable end-to-end | — |
| **Model** | Provider-agnostic via Mastra routing (`openai/…`, `anthropic/…`) | Hosted/subscription/local |

**Where OpenClaw is still ahead (honest version):** breadth of integrations (50+,
incl. WhatsApp/Signal/iMessage), self-writing skills, and years of maturity. memclaw's
wager is that a transparent, observable, event-driven foundation — plus MCP — is the
faster path to *catching and passing* that.

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
- [ ] Deliver proactive results straight to a chosen connector (Telegram DM, etc.)
- [ ] One-line installer (`npm create memclaw`)

## Contributing

The fastest way to grow memclaw is a **capability** — ship a folder or an npm package.
See [CONTRIBUTING.md](CONTRIBUTING.md), [docs/capabilities.md](docs/capabilities.md), and
the [catalog](CAPABILITIES.md).

## License

[MIT](LICENSE) © memclaw contributors. Built on [Mastra](https://mastra.ai).
