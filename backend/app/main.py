import uuid
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from .models import Job, Report
from .schemas import AnalyzeRequest, AnalyzeResponse, JobStatusResponse, ReportResponse
from .tasks import enqueue_analysis
from .utils.hash import pgn_hash

app = FastAPI(title="Chess Pivot Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
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

    # cache hit: if we already have a report for this PGN hash, return that job_id
    cached = db.query(Report).filter(Report.pgn_hash == h).first()
    if cached:
        return AnalyzeResponse(job_id=cached.job_id)

    job_id = str(uuid.uuid4())
    job = Job(id=job_id, status="queued", progress=0, pgn_hash=h)
    db.add(job)
    db.commit()

    settings = req.model_dump(exclude={"pgn"})
    enqueue_analysis(job_id=job_id, pgn=req.pgn, settings=settings)

    return AnalyzeResponse(job_id=job_id)

@app.get("/api/analyze/{job_id}", response_model=JobStatusResponse)
def analyze_status(job_id: str, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(job_id=job.id, status=job.status, progress=job.progress, error_message=job.error_message)

@app.get("/api/report/{job_id}", response_model=ReportResponse)
def get_report(job_id: str, db: Session = Depends(get_db)):
    report = db.get(Report, job_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found (job may still be running).")
    return ReportResponse(
        job_id=job_id,
        headers=report.headers,
        pivotal_moments=report.moment_cards,
        coach_report=report.llm_report
    )
