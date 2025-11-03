#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/fixtures"
mkdir -p "$FIXTURE_DIR"

run() {
  local name="$1"
  local path="$2"
  local payload="$3"

  echo "==> ${name}: POST ${path}"
  curl -sS -X POST "${BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -d "${payload}" | tee "${FIXTURE_DIR}/${name}.json" | jq . >/dev/null
}

run "detect" "/api/detect" '{"question":"Sample text","subject":"english"}'
run "warmup" "/api/warmup" '{"questionId":"tmp-qid-123","candidates":["分詞構句","關代","時態","介系詞"]}'
run "solve" "/api/solve" '{"questionId":"tmp-qid-123","selected":"分詞構句","mode":"step"}'
run "answer" "/api/tutor/answer" '{"questionId":"tmp-qid-123","userAnswer":"B","concept_id":"cpt_abc"}'

echo "Fixtures saved to ${FIXTURE_DIR}"
