#!/usr/bin/env -S npx tsx
/**
 * scripts/scrape.ts
 *
 * Pulls raw responses for every prompt in the IM Care patient probe OpenLens
 * project and saves them to `data/runs/<YYYY-MM-DD>/results.json`.
 *
 * Why this exists: the OpenLens MCP server returns at most 20 rows per
 * `get_prompt_results` call. With 61 prompts × 5 platforms = 305 rows, the
 * natural way to pull is one prompt at a time (5 rows per call). Streaming all
 * of that through an interactive Claude session blows the context budget, so
 * we do it here from a terminal with full access to disk and no model in the
 * middle.
 *
 * Usage:
 *   # First time:
 *   npm install @modelcontextprotocol/sdk dotenv
 *   # Then:
 *   npx tsx scripts/scrape.ts                 # latest run
 *   npx tsx scripts/scrape.ts --run-id <uuid> # a specific run
 *
 * Requires:
 *   - You ran `claude` from this repo at least once and authenticated the
 *     OpenLens MCP. The MCP server URL is read from `.mcp.json`. Auth is
 *     delegated to the same OAuth flow Claude Code uses, via the SDK.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const PROJECT_NAME = "IM Care patient probe";
const TOPIC_NAME = "patient-questions";

// --- CLI flags ---------------------------------------------------------------
const args = process.argv.slice(2);
const runIdFlagIdx = args.indexOf("--run-id");
const explicitRunId =
  runIdFlagIdx >= 0 ? args[runIdFlagIdx + 1] : undefined;

// --- Helpers ----------------------------------------------------------------
function readMcpConfig(): { url: string } {
  const cfg = JSON.parse(readFileSync(join(REPO_ROOT, ".mcp.json"), "utf8"));
  const server = cfg.mcpServers?.["openlens-server"];
  if (!server?.url) {
    throw new Error("`.mcp.json` must contain mcpServers.openlens-server.url");
  }
  return { url: server.url };
}

async function callTool(client: Client, name: string, args: object) {
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) {
    throw new Error(
      `Tool ${name} returned error: ${JSON.stringify(res.content)}`,
    );
  }
  // OpenLens MCP returns one text content item containing JSON
  const item = (res.content as Array<{ type: string; text?: string }>)[0];
  if (!item || item.type !== "text" || !item.text) {
    throw new Error(`Unexpected MCP response shape for ${name}`);
  }
  return JSON.parse(item.text);
}

function today(): string {
  // YYYY-MM-DD in UTC
  return new Date().toISOString().slice(0, 10);
}

// --- Main -------------------------------------------------------------------
async function main() {
  const { url } = readMcpConfig();
  console.log(`[scrape] Connecting to OpenLens MCP at ${url}`);

  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client(
    { name: "im-care-scraper", version: "0.1.0" },
    { capabilities: {} },
  );
  await client.connect(transport);

  // 1. Resolve project_id
  const projects = await callTool(client, "list_projects", {});
  const project = projects.projects.find(
    (p: { name: string }) => p.name === PROJECT_NAME,
  );
  if (!project) {
    throw new Error(`OpenLens project "${PROJECT_NAME}" not found`);
  }
  const projectId = project.id as string;
  console.log(`[scrape] Project ${PROJECT_NAME} (${projectId})`);

  // 2. Resolve run_id
  let runId = explicitRunId;
  if (!runId) {
    const status = await callTool(client, "get_run_status", {
      project_id: projectId,
    });
    runId = status.run?.run_id;
    if (!runId) throw new Error("No latest run found");
  }
  console.log(`[scrape] Run ${runId}`);

  // 3. List prompts
  const prompts = await callTool(client, "list_prompts", {
    project_id: projectId,
    topic_name: TOPIC_NAME,
  });
  console.log(`[scrape] ${prompts.prompts.length} prompts to pull`);

  // 4. Fetch results one prompt at a time (each prompt has ≤5 platform rows)
  const allResults: unknown[] = [];
  let fetched = 0;
  for (const p of prompts.prompts) {
    const r = await callTool(client, "get_prompt_results", {
      project_id: projectId,
      run_id: runId,
      prompt_id: p.id,
      limit: 20,
    });
    allResults.push(...r.results);
    fetched += r.results.length;
    process.stdout.write(
      `\r[scrape] ${fetched} rows pulled (${allResults.length} total)        `,
    );
  }
  process.stdout.write("\n");

  // 5. Get run start/end for metadata
  const runStatus = await callTool(client, "get_run_status", {
    project_id: projectId,
    run_id: runId,
  });

  const out = {
    run_metadata: {
      run_id: runId,
      project_name: PROJECT_NAME,
      project_id: projectId,
      topic_name: TOPIC_NAME,
      started_at: runStatus.run.started_at,
      completed_at: runStatus.run.completed_at,
      active_platforms: runStatus.project.active_platforms,
      result_count: allResults.length,
      scraped_at: new Date().toISOString(),
    },
    results: allResults,
  };

  const dateDir = today();
  const outDir = join(REPO_ROOT, "data", "runs", dateDir);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`[scrape] Wrote ${allResults.length} rows -> ${outPath}`);

  await client.close();
}

main().catch((err) => {
  console.error("[scrape] FAILED:", err);
  process.exit(1);
});
