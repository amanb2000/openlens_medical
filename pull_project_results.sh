#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: ${ENV_FILE} not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

: "${OPENLENS_API_KEY:?OPENLENS_API_KEY not set in .env}"
: "${PROJECT_ID:?PROJECT_ID not set in .env}"

LIMIT="${1:-2000}"

RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "${RESULTS_DIR}"

TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUTFILE="${RESULTS_DIR}/openlens_pull_${TIMESTAMP}.json"

echo "Pulling OpenLens results (projectId=${PROJECT_ID}, limit=${LIMIT})..."

curl -sS -f \
  -H "Authorization: Bearer ${OPENLENS_API_KEY}" \
  "https://openlens.com/api/prompts/results?projectId=${PROJECT_ID}&limit=${LIMIT}" \
  -o "${OUTFILE}"

echo "Saved -> ${OUTFILE}"
