<div align="center">

# 🐾 memclaw

**An open-source, local-first personal AI agent built on the full [Mastra](https://mastra.ai) stack.**

Observational memory · browser use · tool-calling · a pub/sub event bus you can *watch* · first-class observability in Mastra Studio.

</div>

---

memclaw is a personal AI assistant that runs on your machine, remembers you across
conversations, can browse the web and run real tools, and talks to you wherever you
are — your terminal today, Telegram/Slack/Discord with one line of config. Every
message flows over an **event bus**, so the whole system is observable and replayable
instead of being a black box.

It's inspired by [OpenClaw](https://openclaw.ai/), but takes a different bet:
instead of hand-rolling memory, browser control, integrations, and eventing, memclaw
stands on Mastra's batteries-included agent framework — and exposes all of it.

## Quick start

> Requires **Node 20+** and an OpenAI API key.

```bash
git clone https://github.com/USER/memclaw.git
cd memclaw
npm install
npm run setup     # writes .env, asks for your OpenAI key
npm run chat      # start talking in your terminal
```

That's the whole loop. Then, to see everything under the hood:

```bash
npm run dev       # opens Mastra Studio: traces, memory, metrics, screencast
```

## Why memclaw?

memclaw's bet is **architecture over accretion**. Because it's built on Mastra, the
hard parts — long-term memory, browser automation, channel integrations, tracing,
and a distributed-capable event bus — are first-class and *visible*, not bolted on.

| | 🐾 **memclaw** | OpenClaw |
| --- | --- | --- |
| **Memory** | [Observational Memory](https://mastra.ai/docs/memory/observational-memory): background Observer + Reflector agents that compress history into a dense, humanlike log — plus structured working memory | Persistent memory |
| **Observability** | **First-class.** Every agent run is traced; every bus event is metered. Watch it live in Mastra Studio | Logs |
| **Event bus** | **Built in and inspectable.** Pub/sub backbone with replay; scale from in-process → Unix socket → Redis/GCP by changing one env var | — |
| **Browser** | Real Playwright browser with a **live screencast streamed into Studio** | Browser automation |
| **Connectors** | Native Mastra **channels**: Telegram (no tunnel needed), Slack, Discord — add by dropping credentials in `.env` | WhatsApp, Telegram, Discord, Slack, Signal, iMessage |
| **Extensibility** | A **capability system**: ship a folder (or npm package) of tools + sub-agents + workflows; auto-discovered and registered | Self-writing skills |
| **Stack** | TypeScript, fully typed, hackable end-to-end | — |
| **Model** | Provider-agnostic via Mastra model routing (`openai/…`, `anthropic/…`, …) | Hosted, subscription, or local models |
| **Privacy** | Local-first; your keys, your machine, your data | Local-first |

### Where OpenClaw is still ahead (honest version)

memclaw is young. OpenClaw has years of polish and a big community, and today it
genuinely leads on:

- **Breadth of integrations** — 50+ services and platforms (WhatsApp, Signal, iMessage)
  out of the box. memclaw ships terminal + Telegram/Slack/Discord and a clean way to add more.
- **Self-writing skills** — agents that author and modify their own capabilities through
  conversation. memclaw's tool/connector system is extensible but human-authored (for now).
- **Maturity & community** — battle-tested workflows and a large skill ecosystem.

memclaw's wager is that a transparent, event-driven, observable foundation is the
faster path to *catching and passing* that — and that you should be able to **see
exactly what your agent is doing** the whole way.

## Architecture

Everything is wired through one event bus. Connectors never call the agent directly —
they publish to the bus and the dispatcher does the rest. That decoupling is what makes
the system observable, replayable, and easy to extend.

```
   ┌──────────┐     inbound      ┌────────────┐    generate()   ┌──────────────┐
   │ Connector│ ───────────────▶ │ Dispatcher │ ──────────────▶ │ memclaw Agent│
   │ cli /    │                  │            │                 │  • obs memory│
   │ telegram │ ◀─────────────── │            │ ◀────────────── │  • tools     │
   │ slack …  │     outbound     └────────────┘     reply       │  • browser   │
   └──────────┘          │                                      └──────────────┘
                         │  (every event)
                         ▼
                  ┌──────────────┐         GET /memclaw/bus
                  │  Bus Monitor │ ───────────────────────────▶  live metrics
                  └──────────────┘         + Mastra Studio traces
```

- **Bus** — Mastra pub/sub. Default is in-process with a replay cache (zero infra).
  Mastra's own workflow/agent/task events ride the **same** bus.
- **Dispatcher** — subscribes to inbound messages, runs the agent scoped to the right
  memory thread, publishes the reply and run-lifecycle events.
- **Bus Monitor** — counts everything (per-topic, run success/failure, throughput, avg
  latency), logs it into Studio, and serves it at `GET /memclaw/bus`.

See [docs/architecture.md](docs/architecture.md) for the full tour.

## Features

### 🧠 Memory that actually remembers
Observational Memory runs background agents that watch conversations and maintain a
compressed observation log, so memclaw stays coherent over long sessions without
context rot — and remembers you across conversations. Working memory holds small
structured state (your name, preferences, goals). Watch both fill up live in Studio's
**Memory** tab.

### 🌐 Browser use
Set `MEMCLAW_BROWSER=true`, run `npx playwright install chromium`, and the agent gains
a real browser with accessibility-first targeting. Studio streams a **live screencast**
so you can watch it navigate.

### 🧰 Capabilities (the extension system)
Everything the agent can do is a **capability** — a self-contained bundle of tools,
specialist sub-agents, and/or workflows. memclaw ships `time`, `web`, `weather`, and an
opt-in `shell`; `npm run caps` shows what's active. Adding one is copying a folder; the
agent code never changes. Publish a capability as an npm package and anyone can enable it
with one env var. This is the path to OpenClaw-style breadth — and the main way to
contribute. See [docs/capabilities.md](docs/capabilities.md) and the
[catalog](CAPABILITIES.md).

### 🔌 Connectors / channels
The terminal works out of the box. Add a platform by putting its credentials in `.env`:
Telegram runs over long-polling (**no public URL needed**); Slack/Discord use webhooks.
See [docs/connectors.md](docs/connectors.md).

### 📈 Observability
`npm run dev` opens Mastra Studio: full execution traces, the live memory view, the
browser screencast, and your logs. Bus metrics are one curl away:
`curl http://localhost:4111/memclaw/bus`.

## Configuration

All configuration is via `.env` (start from [`.env.example`](.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Model provider key (required) |
| `MEMCLAW_MODEL` | `openai/gpt-5-mini` | Agent model (`provider/model`) |
| `MEMCLAW_MEMORY_MODEL` | `openai/gpt-5-mini` | Observer/Reflector model |
| `MEMCLAW_PUBSUB` | `memory` | Bus backend: `memory` \| `unix` \| `redis` |
| `MEMCLAW_BROWSER` | `false` | Enable the Playwright browser |
| `MEMCLAW_ENABLE_SHELL` | `false` | Expose the shell tool (dangerous) |
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

## Roadmap

- [ ] Self-authoring skills (agent writes its own tools)
- [ ] More connectors: WhatsApp, Signal, iMessage, email, web widget
- [ ] Scheduled/proactive tasks via Mastra background tasks
- [ ] Multi-agent networks for specialized sub-tasks
- [ ] One-line installer (`npm create memclaw`)

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © memclaw contributors. Built on [Mastra](https://mastra.ai).
