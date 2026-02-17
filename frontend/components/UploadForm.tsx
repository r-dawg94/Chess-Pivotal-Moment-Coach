"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function UploadForm() {
  const [pgn, setPgn] = useState("");
  const [depth, setDepth] = useState(14);
  const [maxPivots, setMaxPivots] = useState(10);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setStatus("queued");
    setProgress(0);

    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pgn, depth, max_pivots: maxPivots })
    });

    if (!res.ok) {
      const t = await res.text();
      setError(t);
      setStatus(null);
      return;
    }

    const data = await res.json();
    setJobId(data.job_id);
  }

  async function poll(id: string) {
    const res = await fetch(`${API_BASE}/api/analyze/${id}`);
    const data = await res.json();
    setStatus(data.status);
    setProgress(data.progress || 0);
    if (data.status === "error") setError(data.error_message || "Unknown error");
    if (data.status === "done") window.location.href = `/report/${id}`;
  }

  // lightweight polling when jobId present
  if (jobId && status !== "done" && status !== "error") {
    setTimeout(() => poll(jobId), 1200);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label>
        <div style={{ fontWeight: 600 }}>Paste PGN</div>
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          rows={14}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          placeholder='Paste a PGN here...'
        />
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Depth{" "}
          <input type="number" value={depth} onChange={(e) => setDepth(parseInt(e.target.value || "14"))} min={8} max={22} />
        </label>
        <label>
          Max pivots{" "}
          <input type="number" value={maxPivots} onChange={(e) => setMaxPivots(parseInt(e.target.value || "10"))} min={3} max={20} />
        </label>

        <button
          onClick={start}
          disabled={pgn.trim().length === 0}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          Analyze
        </button>
      </div>

      {status && (
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <div><b>Status:</b> {status}</div>
          <div><b>Progress:</b> {progress}%</div>
          {jobId && <div><b>Job:</b> {jobId}</div>}
        </div>
      )}

      {error && (
        <div style={{ background: "#ffecec", border: "1px solid #ffb3b3", padding: 12, borderRadius: 10 }}>
          <b>Error:</b> {error}
        </div>
      )}
    </div>
  );
}
