FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends stockfish && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy backend app package (worker imports app.*)
COPY ../backend/app ./app

ENV PYTHONUNBUFFERED=1

CMD ["python", "worker.py"]
