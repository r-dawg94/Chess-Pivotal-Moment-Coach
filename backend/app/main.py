import uuid
import json
import hashlib
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from .models import Job, Report
from .schemas import AnalyzeRequest, AnalyzeResponse, JobStatusResponse, ReportResponse, PivotMoment
from .tasks import enqueue_analysis, get_redis
from .utils.hash import pgn_hash
from app.analysis.explain import explain_pivots
from app import report2

app = FastAPI(title="Chess Pivot Coach API")

logger = logging.getLogger("chess_coach")
logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://congenial-cod-r4xrggj4q4q6256xj-3000.app.github.dev",
    ],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)):
    if len(req.pgn) > 1_000_000:
        raise HTTPException(status_code=400, detail="PGN too large.")

    h = pgn_hash(req.pgn)
    settings = req.model_dump(exclude={"pgn"})

    settings_hash = hashlib.sha256(json.dumps(settings, sort_keys=True).encode()).hexdigest()[:16]
    cache_key = f"{h}:{settings_hash}"

    cached = db.query(Report).filter(Report.pgn_hash == cache_key).first()
    if cached:
        try:
            db_job_id = cached.job_id
            rq_job_id = enqueue_analysis(db_job_id=db_job_id, pgn=req.pgn, settings=settings)
            logger.info("enqueued db_job_id=%s rq_job_id=%s queue=analysis", db_job_id, rq_job_id)
        except Exception as e:
            logger.exception("Failed to enqueue (cache-hit) job %s: %s", cached.job_id, e)
            raise HTTPException(status_code=500, detail=str(e))
        return AnalyzeResponse(db_job_id=db_job_id, rq_job_id=rq_job_id)

    db_job_id = str(uuid.uuid4())
    job = Job(id=db_job_id, status="queued", progress=0, pgn_hash=cache_key)
    db.add(job)
    db.commit()

    try:
        rq_job_id = enqueue_analysis(db_job_id=db_job_id, pgn=req.pgn, settings=settings)
        logger.info("enqueued db_job_id=%s rq_job_id=%s queue=analysis", db_job_id, rq_job_id)
    except Exception as e:
        logger.exception("Failed to enqueue job %s: %s", db_job_id, e)
        raise HTTPException(status_code=500, detail=str(e))

    return AnalyzeResponse(db_job_id=db_job_id, rq_job_id=rq_job_id)


@app.get("/api/analyze/{job_id}", response_model=JobStatusResponse)
def analyze_status(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        # If the caller accidentally passed an RQ job id, detect and return
        # a clearer 404 message to avoid ambiguity between RQ ids and DB ids.
        try:
            r = get_redis()
            if r and r.exists(f"rq:job:{job_id}"):
                raise HTTPException(
                    status_code=404,
                    detail="Job not found. You passed an RQ job id (rq_job_id); poll the DB id (db_job_id) returned by POST /api/analyze.",
                )
        except Exception:
            # ignore redis errors and fallthrough to generic 404
            pass
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(job_id=job.id, status=job.status, progress=job.progress, error_message=job.error_message)


@app.get("/api/report/{job_id}", response_model=ReportResponse)
def get_report(job_id: str, db: Session = Depends(get_db)):
    report = db.get(Report, job_id)
    if not report:
        # Helpful message if caller passed an RQ id by mistake
        try:
            r = get_redis()
            if r and r.exists(f"rq:job:{job_id}"):
                raise HTTPException(
                    status_code=404,
                    detail="Report not found. You passed an RQ job id (rq_job_id); use the DB id (db_job_id) from POST /api/analyze to poll for report.",
                )
        except Exception:
            pass
        raise HTTPException(status_code=404, detail="Report not found (job may still be running).")
    # Ensure pivotal_moments are serialized as PivotMoment objects (not dicts)
    return ReportResponse(
        job_id=job_id,
        headers=report.headers,
        pivotal_moments=[PivotMoment.model_validate(m) for m in report.moment_cards],
        coach_report=report.llm_report
    )

# --- Plain-English report (computed on the fly) ---
from app.db import SessionLocal
from app.models import Report as ReportModel

@app.get("/api/report2/{job_id}")
def get_report2(job_id: str):
    db = SessionLocal()
    try:
        r = db.query(ReportModel).filter(ReportModel.job_id == job_id).first()
        if not r:
            return {"detail": "Report not found (job may still be running)."}
        headers = r.headers or {}
        pivots = r.moment_cards or []
        coach_report = explain_pivots(headers, pivots)
        return {
            "job_id": job_id,
            "headers": headers,
            "pivotal_moments": pivots,
            "coach_report": coach_report,
        }
    finally:
        db.close()
