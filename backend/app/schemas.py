from typing import List, Optional, Any
from pydantic import BaseModel, Field

class PVMove(BaseModel):
    uci: str
    san: str
    fen_after: str
    eval_cp: Optional[int] = None

class CandidateLine(BaseModel):
    uci: str
    san: str
    eval_cp: Optional[int] = None
    pv: List[PVMove] = Field(default_factory=list)

class PivotMoment(BaseModel):
    ply: int
    side_to_move: str
    fen_before: str
    uci_played: str
    san_played: str
    uci_best: str
    san_best: str
    eval_before_cp: Optional[int] = None
    eval_after_played_cp: Optional[int] = None
    eval_after_best_cp: Optional[int] = None
    pv_best: List[PVMove] = Field(default_factory=list)
    candidates: List[CandidateLine] = Field(default_factory=list)
    pv_played: List[PVMove] = Field(default_factory=list)
    candidates_played: List[CandidateLine] = Field(default_factory=list)
    why_bad: Optional[str] = None
    what_instead: Optional[str] = None
    why_instead: Optional[str] = None
    remember: Optional[str] = None


class AnalyzeRequest(BaseModel):
    pgn: str = Field(..., description="PGN text")
    depth: int = 14
    multipv: int = 2
    max_pivots: int = 10
    swing_threshold_cp: int = 120
    min_ply_gap: int = 6  # spacing between pivotal moments

class AnalyzeResponse(BaseModel):
    db_job_id: str
    rq_job_id: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    error_message: Optional[str] = None

class ReportResponse(BaseModel):
    job_id: str
    headers: dict
    pivotal_moments: List[PivotMoment]
    coach_report: dict
