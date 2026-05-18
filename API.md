# OpenLens API

The basic shape of the Openlens `/api/prompts/results` endpoint is:

```bash
curl -H "Authorization: Bearer $OPENLENS_API_KEY" \
    "https://openlens.com/api/prompts/results?projectId=<id>&limit=200" \
    | jq '.[0]'
```

For convenience, you can use `pull_project_results.sh` to read credentials from `.env`, hit the endpoint, and save the raw JSON to a timestamped file under `results/`.

## `pull_project_results.sh`

### Setup

Create a `.env` file in the repo root (gitignored — never commit it):

```
OPENLENS_API_KEY=sk-...
PROJECT_ID=<your-openlens-project-id>
```

The script sources this file directly, so any other env vars in `.env` are also loaded into its environment.

### Usage

```bash
./pull_project_results.sh         # default limit = 2000
./pull_project_results.sh 500     # override limit
```

Output is written to `results/openlens_pull_<UTC-timestamp>.json` (e.g. `results/openlens_pull_20260517T142301Z.json`). The `results/` directory is created if it doesn't exist.

### How `limit` works

`limit` is the **maximum number of prompt-result rows** returned by `/api/prompts/results` in a single call. The endpoint returns a flat array of rows (one per prompt × platform run), so the row count grows with both the number of prompts in the project and the number of platforms each prompt has been run against.

- Default in this script is `2000` — large enough to capture a full run of the IM Care patient probe across all platforms in one call.
- If you have more rows than `limit`, the response is truncated; bump the argument (e.g. `./pull_project_results.sh 5000`).
- There is no pagination cursor exposed here — `limit` is the only knob. If you need everything and aren't sure how many rows exist, pull with a generous limit and inspect the array length (`jq 'length' results/openlens_pull_*.json`).
