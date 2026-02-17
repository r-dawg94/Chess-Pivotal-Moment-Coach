import os
from redis import Redis
from rq import Queue

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = Redis.from_url(REDIS_URL)
queue = Queue("analysis", connection=redis_conn, default_timeout=900)

def enqueue_analysis(job_id: str, pgn: str, settings: dict):
    return queue.enqueue("app.worker_jobs.run_analysis", job_id, pgn, settings)
