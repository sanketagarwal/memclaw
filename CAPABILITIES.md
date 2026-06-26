# Capability catalog

A directory of capabilities for memclaw. Want to see something here? Build it and
open a PR — see [docs/capabilities.md](docs/capabilities.md).

## Built-in

These ship with memclaw and load automatically (`npm run caps` to see status).

| Capability | id | Contributes | Needs |
| --- | --- | --- | --- |
| Time | `time` | `datetime` tool | — |
| Web | `web` | `web-fetch` tool | — |
| Weather | `weather` | `weather` tool | — |
| Spreadsheet | `spreadsheet` | read/analyze local `.xlsx` & `.csv` (sheets, rows, column stats) | — |
| Shell | `shell` | `shell` tool (approval-gated) | `MEMCLAW_ENABLE_SHELL=true` |

## Community

Capabilities published as npm packages. Install, then add to `MEMCLAW_CAPABILITIES`.

| Capability | Package | What it does |
| --- | --- | --- |
| _Your capability here_ | `memclaw-cap-…` | Open a PR to add it |

## Wanted

High-value capabilities we'd love contributions for:

- **Files** — read/write/search the local filesystem (scoped, approval-gated)
- **GitHub** — repos, issues, PRs, code search
- **Calendar / Email** — Google/Microsoft read + draft
- **Search** — web search (Brave/Tavily/SerpAPI)
- **Notion / Obsidian** — read & update notes
- **Docs chatbot** — RAG over a knowledge base (lift the Mastra template)
- **Chat-with-YouTube** — transcript Q&A (lift the Mastra template)
- **Customer-feedback summary** — a workflow capability (lift the Mastra template)

Pick one, copy `src/capabilities/_template/`, and ship it.
