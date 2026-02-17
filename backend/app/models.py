import datetime as dt
from sqlalchemy import String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[str] = mapped_column(String, default="queued", index=True)  # queued|running|done|error
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    pgn_hash: Mapped[str] = mapped_column(String, index=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    report = relationship("Report", back_populates="job", uselist=False)

class Report(Base):
    __tablename__ = "reports"

    job_id: Mapped[str] = mapped_column(String, ForeignKey("jobs.id"), primary_key=True)
    pgn_hash: Mapped[str] = mapped_column(String, index=True)

    headers: Mapped[dict] = mapped_column(JSON)
    moment_cards: Mapped[list] = mapped_column(JSON)
    llm_report: Mapped[dict] = mapped_column(JSON)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    job = relationship("Job", back_populates="report")
