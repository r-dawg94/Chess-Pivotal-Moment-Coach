import os
from sqlalchemy.orm import Session
from .db import SessionLocal, engine
from .models import Job, Report
from .analysis.pgn import parse_pgn
from .analysis.engine import open_engine
from .analysis.pivots import detect_pivots
from .analysis.narration import narrate

def _set_job(db: Session, job_id: str, **kwargs):
    job = db.get(Job, job_id)
    if not job:
        return
    for k, v in kwargs.items():
        setattr(job, k, v)
    db.commit()

def run_analysis(job_id: str, pgn: str, settings: dict):
    db = SessionLocal()
    try:
        _set_job(db, job_id, status="running", progress=5, error_message=None)

        game = parse_pgn(pgn)
        headers = dict(game.headers)

        _set_job(db, job_id, progress=20)
        engine_sf = open_engine()
        try:
            cards = detect_pivots(
                game=game,
                engine=engine_sf,
                depth=int(settings.get("depth", 14)),
                multipv=int(settings.get("multipv", 2)),
                max_pivots=int(settings.get("max_pivots", 10)),
                swing_threshold_cp=int(settings.get("swing_threshold_cp", 120)),
                min_ply_gap=int(settings.get("min_ply_gap", 6)),
            )
        finally:
            engine_sf.quit()

        _set_job(db, job_id, progress=70)

        coach = narrate(headers=headers, moment_cards=cards)

        # upsert report
        job = db.get(Job, job_id)
        if not job:
            raise RuntimeError("Job missing during report save.")
        existing = db.get(Report, job_id)
        if existing:
            existing.headers = headers
            existing.moment_cards = cards
            existing.llm_report = coach
        else:
            db.add(Report(job_id=job_id, pgn_hash=job.pgn_hash, headers=headers, moment_cards=cards, llm_report=coach))
        db.commit()

        _set_job(db, job_id, status="done", progress=100)
    except Exception as e:
        _set_job(db, job_id, status="error", progress=100, error_message=str(e))
        raise
    finally:
        db.close()
