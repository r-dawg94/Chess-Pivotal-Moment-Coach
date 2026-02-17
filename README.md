# Chess Pivot Coach (Web app + Stockfish + LLM narration)

This is a turnkey starter project:
- **Frontend:** Next.js
- **Backend:** FastAPI
- **Queue/Worker:** Redis + RQ
- **DB:** Postgres
- **Engine:** Stockfish (UCI)
- **Narration:** OpenAI Responses API with strict JSON schema output

## Quick start (local with Docker)

1) Copy env file and add your key:
```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY=...
```

2) Start everything:
```bash
docker compose up --build
```

3) Open the app:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

## What you get
- Upload/paste PGN
- Job runs async (worker)
- Report includes pivotal moments (eval swings) + PV lines + LLM coaching report

## Notes
- Stockfish depth defaults to 14; change via UI or API.
- This is v1 scaffolding: good foundation to add board viewer, eval chart, user accounts, share links, etc.
