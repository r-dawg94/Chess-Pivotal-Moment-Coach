from pydantic import BaseModel, Field
from typing import Optional, Any

class AnalyzeRequest(BaseModel):
    pgn: str = Field(..., description="PGN text")
    depth: int = 14
    multipv: int = 2
    max_pivots: int = 10
    swing_threshold_cp: int = 120
    min_ply_gap: int = 6  # spacing between pivotal moments

class AnalyzeResponse(BaseModel):
    job_id: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    error_message: Optional[str] = None

class ReportResponse(BaseModel):
    job_id: str
    headers: dict
    pivotal_moments: list[dict]
    coach_report: dict
