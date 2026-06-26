# Architecture

memclaw is a thin, opinionated layer over [Mastra](https://mastra.ai). The design goal
is **transparency**: every message and every agent action should be observable and,
where possible, replayable. The way it achieves that is by routing everything through a
pub/sub **event bus**.

## The bus is the spine

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

### Topics (`src/bus/topics.ts`)

| Topic | Published by | Meaning |
| --- | --- | --- |
| `memclaw.message.inbound` | connectors | a user said something |
| `memclaw.message.outbound` | dispatcher | the agent's reply, addressed to a connector |
| `memclaw.agent.run.started` | dispatcher | a run began |
| `memclaw.agent.run.completed` | dispatcher | a run finished |
| `memclaw.agent.run.failed` | dispatcher | a run threw |

Mastra's own systems (workflow orchestration, agent stream chunks, background tasks,
resumable streams) publish onto the **same** bus under their own topic families. So
whatever backend you choose applies to memclaw and Mastra alike.

### Backends (`src/bus/pubsub.ts`)

Pick with `MEMCLAW_PUBSUB`; the rest of the code never changes:

| Value | Backend | Scope | Replay |
| --- | --- | --- | --- |
| `memory` (default) | `CachingPubSub(EventEmitterPubSub)` | one process | yes (in-memory cache) |
| `unix` | `UnixSocketPubSub` | processes on one host | — |
| `redis` | `RedisStreamsPubSub` | many hosts | yes (persisted) |

The default wraps the in-process emitter in a replay cache, so a connector that
disconnects can catch up on what it missed — the same property that lets memclaw stay
responsive across reconnects.

## The pieces

- **`src/mastra/index.ts`** — the Mastra instance. Owns storage (LibSQL for app data,
  DuckDB for the analytical observability domain), the Pino logger, the Observability
  config (traces → storage → Studio, with secret redaction), the configured pub/sub
  bus, and a custom `GET /memclaw/bus` route. It also constructs and starts the
  **Bus Monitor** in whatever process imports it.
- **`src/agents/memclaw-agent.ts`** — a factory that builds the agent from a loaded
  capability bundle (its tools, sub-agents, and workflows), plus observational + working
  memory, an optional browser, and any configured channels.
- **`src/capabilities/`** — the extension system. `loadCapabilities()` merges built-in
  and external capabilities into the bundle the agent is built from. See
  [capabilities.md](capabilities.md).
- **`src/runtime/dispatcher.ts`** — the bus loop: inbound → `agent.generate(...)` scoped
  to the message's memory thread → outbound + lifecycle events.
- **`src/runtime/start.ts`** — wires the dispatcher and starts the given connectors,
  all sharing `mastra.pubsub`.
- **`src/bus/monitor.ts`** — subscribes to every topic and keeps counters (per-topic,
  run success/failure, throughput, avg latency); logs each event into Studio.

## Why two runtimes?

memclaw has two ways to run, and they share the same Mastra instance (so the same
storage, observability, and config):

- **`npm run dev`** → the Mastra **server** + Studio. Serves the Studio UI, the agent
  playground, the platform-channel webhooks, and `GET /memclaw/bus`.
- **`npm run chat` / `start`** → the **bus runtime**: the dispatcher, the terminal
  connector, and the monitor, in a single process.

Both write traces to the same store, so agent runs from either show up in Studio. With
the default in-process bus each runtime has its own bus; to share one bus across both
processes, set `MEMCLAW_PUBSUB=unix` (or `redis`).
