#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== repo ==="
pwd
echo

echo "=== docker compose ps ==="
docker compose ps || true
echo

echo "=== backend health ==="
if curl -sS http://localhost:8000/docs >/dev/null; then
  echo "backend_OK"
else
  echo "backend_BAD"
fi
echo

echo "=== frontend health ==="
if curl -sS http://localhost:3000/ >/dev/null; then
  echo "frontend_OK"
else
  echo "frontend_BAD"
fi
echo

echo "=== smoke: POST /api/analyze (via Next proxy) ==="
RESP="$(curl -sS -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"pgn":"1. e4 e5 2. Nf3 Nc6","depth":10,"max_pivots":2,"threshold_cp":80,"min_ply_gap":2,"explain_top_n":2}')"
echo "$RESP"
echo

DB_JOB_ID="$(echo "$RESP" | python -c 'import sys,json; print(json.load(sys.stdin).get("db_job_id",""))')"
if [[ -z "${DB_JOB_ID}" ]]; then
  echo "Could not parse db_job_id from response."
  exit 1
fi

echo "db_job_id=$DB_JOB_ID"
echo

echo "=== poll: GET /api/analyze/$DB_JOB_ID ==="
deadline=$((SECONDS+60))
while (( SECONDS < deadline )); do
  STATUS="$(curl -sS "http://localhost:3000/api/analyze/$DB_JOB_ID" || true)"
  echo "$STATUS"
  echo "$STATUS" | python - <<'PY' >/dev/null 2>&1 || true
import sys, json
j=json.load(sys.stdin)
s=j.get("status","")
p=j.get("progress",0)
if s in ("done","failed") or p==100:
    raise SystemExit(0)
raise SystemExit(1)
PY
  if [[ $? -eq 0 ]]; then
    echo "done"
    exit 0
  fi
  sleep 2
done

echo "Timed out waiting for job completion."
exit 1
