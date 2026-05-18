# Run 2026-05-18 — partial results

**Run ID:** `6db8c5ce-908c-4c13-8e3b-dfcb19a8bf42`
**Project:** IM Care patient probe (`b92c3467-b9f9-448f-ada0-e599521f9a7e`)
**Started:** 2026-05-18T00:58:58Z
**Completed:** 2026-05-18T01:32:36Z (~33.5 min)
**Total responses:** 305 (61 prompts × 5 platforms: ChatGPT, Perplexity, Google AI, Gemini, Claude)
**Failures:** 0

## What's in this folder

Inline-pulling all 305 responses into the assistant session would blow the
context budget, so this folder currently contains a **5-prompt smoke test**
pulled by the assistant directly, plus the `scripts/scrape.ts` tool that
fetches the full set from your terminal.

- [`sample-summary.md`](./sample-summary.md) — side-by-side, top-line view of
  how all 5 platforms answered the five sampled prompts, with the first ~200
  characters of each response and a note on citation quality.
- [`sample-pediatric-petechial-rash.md`](./sample-pediatric-petechial-rash.md)
  — **the highest-stakes prompt in the probe**, with each platform's response
  reproduced in full so you can see exactly what a parent would see. Includes
  a quick clinical commentary at the bottom.
- `results.json` — **not yet present.** Run `npm run scrape` from the repo
  root to populate this with all 305 responses.

## Pulling the full results

```bash
cd "$(git rev-parse --show-toplevel)"
npm install              # one-time
npm run scrape           # creates data/runs/<today>/results.json
```

The scrape script:
1. Reads `.mcp.json` for the OpenLens MCP URL
2. Lists prompts via MCP
3. Calls `get_prompt_results` once per prompt (avoids the 20-row limit)
4. Bundles into one JSON with a `run_metadata` block at the top
5. Writes to `data/runs/<today>/results.json`
