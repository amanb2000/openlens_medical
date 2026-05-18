#!/usr/bin/env -S npx tsx
/**
 * scripts/analyze.ts
 *
 * Grades every `{prompt, platform, response}` triple in a saved OpenLens run
 * against the rubric in `rubrics/medical-quality.md`. Emits one markdown file
 * per prompt to `analysis/<YYYY-MM-DD>/<prompt-slug>.md` and one aggregate
 * `summary.md` for the run.
 *
 * Prompt-caching: the rubric is identical on every grader call, so it's sent
 * with `cache_control: { type: "ephemeral" }`. Anthropic caches it for ~5
 * minutes between requests, which makes grading ~300 responses ~80% cheaper
 * than no-cache.
 *
 * Usage:
 *   npx tsx scripts/analyze.ts                       # latest run in data/runs/
 *   npx tsx scripts/analyze.ts --run 2026-05-18      # specific date folder
 *   npx tsx scripts/analyze.ts --run 2026-05-18 --limit 10   # quick subset
 *   npx tsx scripts/analyze.ts --dry-run             # validate without API calls
 *
 * Requires:
 *   ANTHROPIC_API_KEY in .env or environment.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

// ---- Tunables ---------------------------------------------------------------
const MODEL = "claude-opus-4-6";       // grader model — update as new ones ship
const MAX_TOKENS = 2000;
const CONCURRENCY = 5;                  // parallel grader calls
const RETRY_LIMIT = 3;
const RETRY_BACKOFF_MS = 2000;

// ---- CLI flags --------------------------------------------------------------
const args = process.argv.slice(2);
const runFlagIdx = args.indexOf("--run");
const limitIdx = args.indexOf("--limit");
const dryRun = args.includes("--dry-run");
const explicitRun = runFlagIdx >= 0 ? args[runFlagIdx + 1] : undefined;
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;

// ---- Types ------------------------------------------------------------------
interface ResultRow {
  id: string;
  platform: string;
  topic_name: string;
  prompt_id: string;
  prompt_template: string;
  prompt_used: string;
  raw_response: string;
  outcome: string | null;
  created_at: string;
  mentions: unknown[];
  citations: Array<{ url: string; title: string; domain: string; domain_category: string }>;
}

interface RunFile {
  run_metadata: {
    run_id: string;
    project_name: string;
    project_id: string;
    topic_name: string;
    started_at: string;
    completed_at: string;
    active_platforms: string[];
    result_count: number;
    scraped_at: string;
  };
  results: ResultRow[];
}

interface CriterionScore {
  score: number;
  justification: string;
}

interface Grade {
  scores: {
    clinical_accuracy: CriterionScore;
    safety: CriterionScore;
    recency: CriterionScore;
    local_relevance: CriterionScore;
    citation_quality: CriterionScore;
    hallucination_risk: CriterionScore;
  };
  verdict: {
    paragraph: string;
    tag: "SAFE TO ACT ON" | "USE WITH CAUTION" | "DO NOT ACT ON";
  };
}

interface GradedResult {
  row: ResultRow;
  grade: Grade | null;
  error: string | null;
}

// ---- Helpers ----------------------------------------------------------------
function findLatestRun(): string {
  const runsDir = join(REPO_ROOT, "data", "runs");
  if (!existsSync(runsDir)) {
    throw new Error(`No data/runs/ folder found at ${runsDir}`);
  }
  const dates = readdirSync(runsDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .filter((d) => existsSync(join(runsDir, d, "results.json")))
    .sort()
    .reverse();
  if (dates.length === 0) {
    throw new Error("No data/runs/<date>/results.json found. Run `npm run scrape` first.");
  }
  return dates[0];
}

function slugify(text: string, maxLen = 60): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

function loadRubric(): string {
  return readFileSync(join(REPO_ROOT, "rubrics", "medical-quality.md"), "utf8");
}

function loadRun(date: string): RunFile {
  const path = join(REPO_ROOT, "data", "runs", date, "results.json");
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as RunFile;
  if (!parsed.run_metadata || !Array.isArray(parsed.results)) {
    throw new Error(`Malformed results.json at ${path}`);
  }
  return parsed;
}

// ---- Grader ----------------------------------------------------------------
async function gradeOne(
  client: Anthropic,
  rubric: string,
  row: ResultRow,
): Promise<Grade> {
  const userText = [
    "Grade the following AI-platform response against the rubric above.",
    "",
    `**Platform:** ${row.platform}`,
    `**Prompt:**`,
    "```",
    row.prompt_template,
    "```",
    "",
    `**Response:**`,
    "```",
    row.raw_response,
    "```",
    "",
    row.citations.length > 0
      ? `**Citations the platform returned:**\n${row.citations
          .map((c) => `- ${c.title} (${c.domain}) — ${c.url}`)
          .join("\n")}`
      : "**Citations the platform returned:** none",
    "",
    "Return your grade as a JSON object exactly matching the schema in the",
    "rubric, then a one-paragraph verdict ending in one of the bracket tags.",
    "Wrap the JSON in a ```json fenced block so it's parseable.",
  ].join("\n");

  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: "text",
            text: rubric,
            cache_control: { type: "ephemeral" }, // <<< prompt-cached
          },
        ],
        messages: [{ role: "user", content: userText }],
      });

      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Grader returned no text content");
      }
      return parseGrade(textBlock.text);
    } catch (err) {
      if (attempt === RETRY_LIMIT) throw err;
      const wait = RETRY_BACKOFF_MS * attempt;
      console.warn(
        `  [retry ${attempt}/${RETRY_LIMIT - 1}] ${row.platform}/${row.prompt_id.slice(0, 8)} — ${(err as Error).message}; waiting ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Unreachable");
}

function parseGrade(text: string): Grade {
  // Extract the first ```json ... ``` block
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    throw new Error("Grader response missing ```json``` fenced block");
  }
  const parsed = JSON.parse(jsonMatch[1]);
  // Minimal validation — the grader is generally well-behaved
  if (!parsed.scores || !parsed.verdict) {
    throw new Error("Grader JSON missing scores or verdict");
  }
  return parsed as Grade;
}

// ---- Concurrency pool ------------------------------------------------------
async function processInPool<T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;

  async function runner() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
      done++;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

// ---- Output writers --------------------------------------------------------
function writePromptMarkdown(
  outDir: string,
  promptId: string,
  promptText: string,
  attrs: string[],
  graded: GradedResult[],
) {
  const slug = slugify(promptText.slice(0, 80));
  const path = join(outDir, `${slug}.md`);

  const lines: string[] = [];
  lines.push(`# ${promptText}`);
  lines.push("");
  lines.push(`**Prompt ID:** \`${promptId}\``);
  lines.push(`**Attributes:** ${attrs.map((a) => `\`${a}\``).join(", ")}`);
  lines.push("");
  lines.push("## Scores at a glance");
  lines.push("");
  lines.push(
    "| Platform | Clinical | Safety | Recency | Local | Citation | Hallucin. | Verdict |",
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|",
  );
  for (const g of graded) {
    if (!g.grade) {
      lines.push(
        `| ${g.row.platform} | — | — | — | — | — | — | ERROR: ${g.error} |`,
      );
      continue;
    }
    const s = g.grade.scores;
    lines.push(
      `| **${g.row.platform}** | ${s.clinical_accuracy.score} | ${s.safety.score} | ${s.recency.score} | ${s.local_relevance.score} | ${s.citation_quality.score} | ${s.hallucination_risk.score} | ${g.grade.verdict.tag} |`,
    );
  }
  lines.push("");

  for (const g of graded) {
    lines.push(`## ${g.row.platform}`);
    lines.push("");
    if (!g.grade) {
      lines.push(`> ⚠️ Grading failed: ${g.error}`);
      lines.push("");
      lines.push("### Raw response");
      lines.push("```");
      lines.push(g.row.raw_response);
      lines.push("```");
      lines.push("");
      continue;
    }
    const s = g.grade.scores;
    lines.push(`**Verdict:** \`${g.grade.verdict.tag}\``);
    lines.push("");
    lines.push(g.grade.verdict.paragraph);
    lines.push("");
    lines.push("| Criterion | Score | Note |");
    lines.push("|---|---|---|");
    lines.push(`| Clinical accuracy | ${s.clinical_accuracy.score} | ${s.clinical_accuracy.justification} |`);
    lines.push(`| Safety | ${s.safety.score} | ${s.safety.justification} |`);
    lines.push(`| Recency | ${s.recency.score} | ${s.recency.justification} |`);
    lines.push(`| Local relevance | ${s.local_relevance.score} | ${s.local_relevance.justification} |`);
    lines.push(`| Citation quality | ${s.citation_quality.score} | ${s.citation_quality.justification} |`);
    lines.push(`| Hallucination risk | ${s.hallucination_risk.score} | ${s.hallucination_risk.justification} |`);
    lines.push("");
    lines.push("<details><summary>Raw response</summary>");
    lines.push("");
    lines.push("```");
    lines.push(g.row.raw_response);
    lines.push("```");
    lines.push("</details>");
    lines.push("");
  }

  writeFileSync(path, lines.join("\n"));
  return path;
}

function writeSummary(
  outDir: string,
  runMeta: RunFile["run_metadata"],
  byPromptGraded: Map<string, { promptText: string; attrs: string[]; graded: GradedResult[] }>,
) {
  const lines: string[] = [];
  lines.push(`# Analysis summary — ${runMeta.scraped_at.slice(0, 10)}`);
  lines.push("");
  lines.push(`**Run:** \`${runMeta.run_id}\``);
  lines.push(`**Project:** ${runMeta.project_name}`);
  lines.push(`**Platforms:** ${runMeta.active_platforms.join(", ")}`);
  lines.push(`**Prompts graded:** ${byPromptGraded.size}`);
  lines.push("");

  // Aggregate: per-platform average per criterion
  const platforms = runMeta.active_platforms;
  const criteria = [
    "clinical_accuracy",
    "safety",
    "recency",
    "local_relevance",
    "citation_quality",
    "hallucination_risk",
  ] as const;

  const sums: Record<string, Record<string, { sum: number; n: number }>> = {};
  for (const p of platforms) {
    sums[p] = {};
    for (const c of criteria) sums[p][c] = { sum: 0, n: 0 };
  }
  let actCounts: Record<string, Record<string, number>> = {};
  for (const p of platforms) {
    actCounts[p] = { "SAFE TO ACT ON": 0, "USE WITH CAUTION": 0, "DO NOT ACT ON": 0 };
  }

  for (const { graded } of byPromptGraded.values()) {
    for (const g of graded) {
      if (!g.grade) continue;
      for (const c of criteria) {
        sums[g.row.platform][c].sum += g.grade.scores[c].score;
        sums[g.row.platform][c].n += 1;
      }
      actCounts[g.row.platform][g.grade.verdict.tag] += 1;
    }
  }

  lines.push("## Per-platform average scores (1-5)");
  lines.push("");
  lines.push(
    "| Platform | Clinical | Safety | Recency | Local | Citation | Hallucin. | SAFE / CAUTION / DO NOT |",
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|",
  );
  for (const p of platforms) {
    const avg = (c: (typeof criteria)[number]) =>
      sums[p][c].n > 0 ? (sums[p][c].sum / sums[p][c].n).toFixed(2) : "—";
    lines.push(
      `| **${p}** | ${avg("clinical_accuracy")} | ${avg("safety")} | ${avg("recency")} | ${avg("local_relevance")} | ${avg("citation_quality")} | ${avg("hallucination_risk")} | ${actCounts[p]["SAFE TO ACT ON"]} / ${actCounts[p]["USE WITH CAUTION"]} / ${actCounts[p]["DO NOT ACT ON"]} |`,
    );
  }
  lines.push("");

  lines.push("## Per-prompt files");
  lines.push("");
  for (const [pid, { promptText }] of byPromptGraded) {
    const slug = slugify(promptText.slice(0, 80));
    lines.push(`- [${promptText.slice(0, 100)}…](./${slug}.md) — \`${pid.slice(0, 8)}\``);
  }
  lines.push("");

  writeFileSync(join(outDir, "summary.md"), lines.join("\n"));
}

// ---- Main ------------------------------------------------------------------
async function main() {
  const runDate = explicitRun ?? findLatestRun();
  console.log(`[analyze] Run: ${runDate}`);

  const run = loadRun(runDate);
  console.log(
    `[analyze] Loaded ${run.results.length} rows from ${run.run_metadata.project_name}`,
  );

  const rubric = loadRubric();
  console.log(`[analyze] Rubric: ${rubric.length} chars (will be prompt-cached)`);

  // Group by prompt_id so we can write one .md per prompt
  const byPrompt = new Map<string, ResultRow[]>();
  for (const row of run.results) {
    if (!byPrompt.has(row.prompt_id)) byPrompt.set(row.prompt_id, []);
    byPrompt.get(row.prompt_id)!.push(row);
  }
  let promptIds = Array.from(byPrompt.keys());
  if (limit) promptIds = promptIds.slice(0, limit);
  const rowsToGrade = promptIds.flatMap((id) => byPrompt.get(id)!);
  console.log(
    `[analyze] Grading ${rowsToGrade.length} rows across ${promptIds.length} prompts`,
  );

  if (dryRun) {
    console.log("[analyze] --dry-run: stopping before API calls.");
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Add it to .env (see .env.example).");
  }
  const client = new Anthropic();

  // Map for prompt metadata (text + attrs) — needed for output
  // We don't have attrs in results.json, only prompt_template. To get
  // attributes you can re-fetch via MCP, but the markdown is fine without
  // them. We'll just leave attrs empty for now (TODO: thread through scrape.ts).
  const promptMeta = new Map<string, { text: string; attrs: string[] }>();
  for (const [pid, rows] of byPrompt) {
    promptMeta.set(pid, { text: rows[0].prompt_template, attrs: [] });
  }

  const graded = await processInPool(
    rowsToGrade,
    async (row) => {
      try {
        const g = await gradeOne(client, rubric, row);
        return { row, grade: g, error: null } as GradedResult;
      } catch (err) {
        return { row, grade: null, error: (err as Error).message } as GradedResult;
      }
    },
    CONCURRENCY,
    (done, total) => {
      process.stdout.write(`\r[analyze] graded ${done}/${total}     `);
    },
  );
  process.stdout.write("\n");

  // Bucket back into per-prompt groups
  const byPromptGraded = new Map<
    string,
    { promptText: string; attrs: string[]; graded: GradedResult[] }
  >();
  for (const g of graded) {
    const pid = g.row.prompt_id;
    if (!byPromptGraded.has(pid)) {
      byPromptGraded.set(pid, {
        promptText: promptMeta.get(pid)!.text,
        attrs: promptMeta.get(pid)!.attrs,
        graded: [],
      });
    }
    byPromptGraded.get(pid)!.graded.push(g);
  }

  // Write outputs
  const outDir = join(REPO_ROOT, "analysis", runDate);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const [pid, { promptText, attrs, graded }] of byPromptGraded) {
    writePromptMarkdown(outDir, pid, promptText, attrs, graded);
  }
  writeSummary(outDir, run.run_metadata, byPromptGraded);

  const failed = graded.filter((g) => !g.grade).length;
  console.log(
    `[analyze] Done. ${graded.length - failed}/${graded.length} graded, ${failed} failed. Output: ${outDir}`,
  );
}

main().catch((err) => {
  console.error("[analyze] FAILED:", err);
  process.exit(1);
});
