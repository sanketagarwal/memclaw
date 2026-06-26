# Contributing to memclaw

Thanks for wanting to make memclaw better. It's an early, ambitious project — the
goal is a transparent, observable, local-first agent that anyone can extend.

## Getting set up

```bash
git clone https://github.com/USER/memclaw.git
cd memclaw
npm install
npm run setup
npm run doctor      # sanity-check your environment
```

## Project layout

```
src/
  config.ts            env-driven configuration
  agents/              the memclaw agent (memory, tools, browser, channels)
  bus/                 topics, the pub/sub factory, and the bus monitor
  connectors/          the Connector interface + cli + platform channels
  runtime/             the dispatcher and runtime bootstrap
  tools/               the tool registry (add capabilities here)
  browser/             the optional Playwright provider
  mastra/index.ts      the Mastra instance: storage, observability, server, bus
scripts/setup.mjs      interactive first-run setup
```

## The two extension points

- **Add a tool** → [docs/tools.md](docs/tools.md). One `createTool(...)`, register it.
- **Add a connector** → [docs/connectors.md](docs/connectors.md). Implement `Connector`
  (publish inbound, subscribe outbound) or wire a Mastra channel adapter.

## Before you open a PR

```bash
npm run typecheck     # must pass
npm run doctor        # should look sane
```

- Keep changes typed — no `any` without a comment explaining why.
- Match the surrounding style (the codebase is heavily commented on *why*, not *what*).
- New capabilities should flow through the bus where it makes sense, so they stay
  observable.

## Good first issues

- A new tool (calendar, files, search, GitHub).
- A new connector (web widget, email, WhatsApp).
- A bus metrics dashboard route.
- Tests around the dispatcher and bus monitor.

By contributing you agree your work is licensed under the project's [MIT License](LICENSE).
