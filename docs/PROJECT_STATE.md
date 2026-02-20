# Chess Pivotal Moment Coach — Project State (Source of Truth)

## Goal
Web app that lets me upload a PGN, run engine analysis, and return “pivotal moment” coaching feedback.

## Stack / Architecture
- Frontend: Next.js (port 3000)
- Backend: FastAPI (port 8000)
- Engine: Stockfish
- Dev env: GitHub Codespaces + forwarded ports

## How to run (Codespace)
### Start (preferred)
PASTE COMMAND HERE (e.g., docker compose up --build)

### Health checks
- Backend local: curl -sS http://localhost:8000/docs >/dev/null && echo backend_local_OK || echo backend_local_BAD
- Frontend local: curl -sS http://localhost:3000/ | head -n 5

## Environment variables
- NEXT_PUBLIC_API_BASE = https://<YOUR-CODESPACE>-8000.app.github.dev

## Current blocker
When I click **Analyze** in the UI, I get an error.

### Error details (paste exact text)
- Browser console error:
  PASTE HERE
- Network tab (failed request URL + status):
  PASTE HERE
- Backend logs (if any):
  PASTE HERE

## UI change requested
Remove the “hydration” section from the UI (looks bad / not needed).

- Where it appears (page/component):
  PASTE HERE
- Suspected file(s):
  PASTE HERE

## What I already verified
- Frontend listens on 3000
- Backend /docs works locally and via forwarded URL

## Next actions I want ChatGPT to do
1) Fix Analyze error
2) Remove hydration section
3) Provide exact code changes + terminal commands
