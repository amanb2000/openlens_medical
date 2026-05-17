# medical-openlens — instructions for Claude Code

You are helping Dr. Bhargava run an analysis of how AI search platforms answer questions a real patient of his internal medicine practice (IM Care) might ask. The workflow is documented in `README.md` — read it first.

## What this repo does

1. **Authors patient prompts** in `prompts/patient-questions.json`.
2. **Runs them through the OpenLens MCP server** (registered in `.mcp.json`) to get raw responses from ChatGPT, Claude, Perplexity, Gemini, and Google AI Overview.
3. **Grades the responses offline** with the Anthropic API using a rubric in `rubrics/medical-quality.md`.

Raw responses go to `data/runs/<YYYY-MM-DD>/results.json`. Graded analysis goes to `analysis/<YYYY-MM-DD>/`. Both are committed to git.

## Critical: suppress OpenLens auto-generated prompts

OpenLens, by default, **invents its own prompts** based on the brand description when you create a project. **We do not want this.** Every prompt sent to OpenLens must come from `prompts/patient-questions.json`.

When creating an OpenLens project, always pass `prompts_per_topic: 0` to `setup_client`. When pushing prompts into an existing project that already has auto-gen prompts, use `update_project_settings` with `refresh_prompts: "replace_generated"` and `confirm_recreate_generated_prompts: true` first, then add the custom prompts.

## OpenLens MCP — useful tools

The OpenLens MCP server is registered in `.mcp.json`. Its tools are deferred — load schemas with `ToolSearch(query="select:mcp__openlens-server__<name>")` before calling.

| Goal | Tool |
|---|---|
| List the user's projects | `list_projects` |
| Confirm available platforms | `list_platforms` |
| Create project, skip auto-gen | `setup_client` with `prompts_per_topic: 0` |
| List allowed prompt attributes | `list_prompt_attributes` |
| Add a custom attribute | `add_prompt_attribute` |
| Retire a custom attribute | `archive_prompt_attribute` (reverse with `unarchive_prompt_attribute`) |
| Add a prompt | `add_prompt` |
| Edit a prompt's text or attributes | `update_prompt_template` |
| List existing prompts in the project | `list_prompts` |
| Replace auto-gen prompts | `update_project_settings` (refresh_prompts: "replace_generated") |
| Run all active prompts | `run_prompts` |
| Poll run status | `get_run_status` |
| **Pull raw responses** | `get_prompt_results` |

**Use only `get_prompt_results` for this project.** The brand-visibility / sentiment helpers (`get_brand_visibility`, `get_topic_sentiment_summary`, workstreams, etc.) are scored for brand tracking — they are not useful for grading medical quality. Ignore them.

## Prompt file format

`prompts/patient-questions.json`:

```json
{
  "project_name": "IM Care patient probe",
  "topic": "patient-questions",
  "prompts": [
    { "text": "...", "attributes": ["medication", "age-senior", "question-type-informational"] }
  ]
}
```

`attributes` are required on every prompt and must exist in the project's attribute list (built-in or previously added via `add_prompt_attribute`).

## Attributes — taxonomy and lifecycle

Attributes are the primary axis for slicing analysis results. Treat the attribute set as **structured metadata**, not free-text tags. The taxonomy this project uses:

- **Age**: `age-pediatric`, `age-adolescent`, `age-adult`, `age-senior`
- **Question type**: `question-type-informational`, `question-type-urgent`, `question-type-evaluation`, `question-type-followup`
- **Clinical domain**: `medication`, `symptom`, `lab-result`, `procedure`, `preventive`, `mental-health`
- **Risk/sensitivity**: `safety`, `comorbidity`, `pregnancy`, `emergency`
- **Intent**: `local`, `comparison`, `decision-support`
- **Variants**: `variant-of-<short-slug>` — groups rephrasings of the same underlying question for side-by-side comparison

Every prompt should carry **at least one age tag, one question-type tag, and one clinical-domain tag**. Variant tags are optional but high-value when the user explicitly wants to test phrasing sensitivity.

### Attribute lifecycle tools

| Tool | When to use |
|---|---|
| `list_prompt_attributes` | Always call first — before `add_prompt`, `update_prompt_template`, or adding new attributes. |
| `add_prompt_attribute` | One call per new custom attribute. Built-ins (`informational`, `local`, etc.) already exist. |
| `archive_prompt_attribute` | Retire a custom attribute. Historical prompts keep their labels; the attribute is just no longer offered for new ones. |
| `unarchive_prompt_attribute` | Reverse the above. |

### Normalization rule (important)

OpenLens normalizes attribute strings: **case-insensitive, punctuation stripped, spaces / hyphens / underscores all treated as the same word boundary**. `age-senior`, `age_senior`, `Age Senior`, and `age senior` are all the same attribute. **Canonical form for this project is lowercase-hyphenated** (`age-senior`, `question-type-informational`). Never produce mixed-case or underscored variants — they will collide silently with the canonical form and confuse the user.

### When the user adds new attributes

Whenever the user proposes a new tag, do these in order:

1. Call `list_prompt_attributes` to confirm it doesn't already exist (under any normalized form).
2. Verify it follows the lowercase-hyphenated convention. If they typed `Age 80+`, canonicalize to `age-80-plus` and confirm with them before adding.
3. Call `add_prompt_attribute`.
4. If multiple new attributes are needed, batch the calls in a single message.

## Output files — always commit

- `data/runs/<YYYY-MM-DD>/results.json` — raw OpenLens output. Schema is whatever `get_prompt_results` returns; save it verbatim plus a top-level `run_metadata` object with `run_id`, `started_at`, `completed_at`, `project_name`.
- `analysis/<YYYY-MM-DD>/<prompt-slug>.md` — one file per prompt, with per-platform sections. Markdown.

`data/runs/` is **not** gitignored here — these results are the artifact. Commit them.

## Analyzer (`scripts/analyze.ts`)

Reads a `data/runs/<date>/results.json`, calls the Anthropic API (`@anthropic-ai/sdk`) with Claude as a grader against `rubrics/medical-quality.md`, writes per-prompt markdown to `analysis/<date>/`.

When you write or modify `analyze.ts`, invoke the `claude-api` skill — it knows the current model IDs and the prompt-caching pattern. **The rubric must be cached** (it's reused for every prompt-platform pair).

## Style

- Default to small, surgical changes.
- Confirm before destructive operations (deleting an OpenLens project, force-pushing, replacing prompts the user just edited).
- The user is a physician, not a developer. Explain things in plain language; don't dump tool output unless asked. When you take an action, say what you did in one sentence.
- Don't invent prompts from your own medical knowledge unless asked — collaborate with the user on the prompt set.
- Patient privacy: prompts must be **synthetic**. If the user mentions a real case, prompt-engineer around it (paraphrase, abstract) before saving.
