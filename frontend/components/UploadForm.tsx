"use client";
import { assertOk, readError } from "../lib/http";
import { useEffect, useMemo, useState } from "react";
import MomentCard from "./MomentCard";

type Pivot = {
  ply: number;
  side_to_move: "White" | "Black";
  fen_before: string;
  played_san: string;
  best_san: string;
  eval_before_cp: number;
  eval_after_cp: number;
  delta_cp: number;
  severity: string;
  pv_san?: string[];
};

type Report2 = {
  job_id: string;
  headers: Record<string, string>;
  pivotal_moments: Pivot[];
};

const SAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.02.18"]
[Round "?"]
[White "maddog_93"]
[Black "javihan"]
[Result "0-1"]
[TimeControl "900+10"]
[WhiteElo "1799"]
[BlackElo "1699"]
[Termination "javihan won by resignation"]
[ECO "C02"]

1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. Bd3 Bd7 7. Bc2 Nge7 8. O-O Ng6 9. Be3 Qxb2 10. Nbd2 Qxc3 11. Nb3 cxd4 12. Nbxd4 Ngxe5 13. Nxe5 Nxe5 14. Rc1 Qa3 15. Bb3 Bd6 16. Bf4 O-O 17. Re1 Ng6 18. Be3 Qa5 19. Nf3 Bb4 20. Re2 Rfc8 21. Rec2 Rc6 22. Nd4 Rxc2 23. Rxc2 h3 Qd8 25. Qh5 Rc8 26. Bxh6 gxh6 27. Qxh6 Bf8 28. Qh5 Qh4 29. Qe2 Qxd4 0-1`;

function cpToText(cp: number) {
  const abs = Math.abs(cp);
  const side = cp >= 0 ? "White" : "Black";
  if (abs < 25) return `≈ equal`;
  if (abs < 100) return `${side} slightly better`;
  if (abs < 250) return `${side} clearly better`;
  if (abs < 500) return `${side} winning chances`;
  return `${side} basically winning`;
}

export default function UploadForm() {
  const [pgn, setPgn] = useState("");
  const [depth, setDepth] = useState(14);
  const [maxPivots, setMaxPivots] = useState(10);
  const [threshold, setThreshold] = useState(80);
  const [gap, setGap] = useState(2);
  const [explainTopN, setExplainTopN] = useState(5);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<null | { title: string; message: string; retry: () => void }>(null);

  const [report, setReport] = useState<Report2 | null>(null);

  const canAnalyze = useMemo(() => pgn.trim().length > 0, [pgn]);

  async function start() {
    setError(null);
    setReport(null);
    setStatus("queued");
    setProgress(0);
    setJobId(null);

    const body = {
      pgn,
      depth,
      max_pivots: maxPivots,
      swing_threshold_cp: threshold,
      min_ply_gap: gap,
      multipv: 2,
    };

    // IMPORTANT: same-origin call; Next rewrites /api/* to your backend
    const res = await fetch(`/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    try {
      await assertOk(res);
    } catch (err: any) {
      setError({
        title: "Analyze failed",
        message: err?.message || String(err),
        retry: () => start(),
      });
      setStatus(null);
      return;
    }

    const data = await res.json();
    const dbJobId = data?.db_job_id;
    // Defensive: check for db_job_id and UUID shape
    if (!dbJobId || typeof dbJobId !== "string") {
      throw new Error(`Missing db_job_id in response: ${JSON.stringify(data)}`);
    }
    // Optionally: check UUID shape (simple regex)
    if (!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(dbJobId)) {
      console.warn("db_job_id does not look like a UUID:", dbJobId);
    }
    setJobId(dbJobId);
    poll(dbJobId);
  }

  async function poll(id: string) {
    for (let i = 0; i < 200; i++) {
      const res = await fetch(`/api/analyze/${id}`);
      try {
        await assertOk(res);
      } catch (err: any) {
        setError({
          title: "Status check failed",
          message: err?.message || String(err),
          retry: () => poll(id),
        });
        setStatus(null);
        return;
      }
      const s = await res.json();
      setStatus(s.status);
      setProgress(s.progress ?? 0);

      if (s.status === "done") {
        await loadReport2(id);
        return;
      }
      if (s.status === "error") {
        setError({
          title: "Analysis failed",
          message: s.error || "Analysis failed",
          retry: () => poll(id),
        });
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    setError({
      title: "Timed out",
      message: "Timed out waiting for analysis to finish.",
      retry: () => poll(id),
    });
  }

  async function loadReport2(id: string) {
    const res = await fetch(`/api/report/${id}?depth=${depth}&max_items=${explainTopN}`);
    try {
      await assertOk(res);
    } catch (err: any) {
      setError({
        title: "Report fetch failed",
        message: err?.message || String(err),
        retry: () => loadReport2(id),
      });
      return;
    }
    const r = (await res.json()) as Report2;
    setReport(r);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setPgn(SAMPLE_PGN)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #444", cursor: "pointer" }}
            title="Load a sample PGN so you can test quickly"
          >
            Load sample PGN
          </button>
          <button
            type="button"
            onClick={() => { setPgn(""); setReport(null); setError(null); setStatus(null); setProgress(0); setJobId(null); }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #444", cursor: "pointer" }}
            title="Clear"
          >
            Clear
          </button>
        </div>
      </div>

      <label>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Paste PGN</div>
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          rows={14}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ccc",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
          placeholder='Paste your PGN here (including headers + moves).'
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
        <label>
          Depth
          <input type="number" value={depth} min={6} max={24} onChange={(e) => setDepth(parseInt(e.target.value || "14", 10))} style={{ width: "100%" }} />
        </label>
        <label>
          Max pivots
          <input type="number" value={maxPivots} min={1} max={30} onChange={(e) => setMaxPivots(parseInt(e.target.value || "10", 10))} style={{ width: "100%" }} />
        </label>
        <label>
          Threshold (cp)
          <input type="number" value={threshold} min={1} max={500} onChange={(e) => setThreshold(parseInt(e.target.value || "80", 10))} style={{ width: "100%" }} />
        </label>
        <label>
          Min ply gap
          <input type="number" value={gap} min={1} max={30} onChange={(e) => setGap(parseInt(e.target.value || "2", 10))} style={{ width: "100%" }} />
        </label>
        <label>
          Explain top N
          <input type="number" value={explainTopN} min={1} max={25} onChange={(e) => setExplainTopN(parseInt(e.target.value || "5", 10))} style={{ width: "100%" }} />
        </label>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button
            type="button"
            onClick={start}
            disabled={!canAnalyze}
            title={!canAnalyze ? "Paste a PGN first" : "Start analysis"}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #222",
              cursor: !canAnalyze ? "not-allowed" : "pointer",
              opacity: !canAnalyze ? 0.6 : 1,
              fontWeight: 800,
            }}
          >
            Analyze
          </button>
        </div>
      </div>

      {status && (
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 12 }}>
          <div><b>Status:</b> {status}</div>
          <div><b>Progress:</b> {progress}%</div>
          {jobId && <div><b>Job:</b> <code>{jobId}</code></div>}
        </div>
      )}

      {error && (
        <div style={{ background: "#ffecec", border: "1px solid #ffb3b3", padding: 12, borderRadius: 12, display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700, color: "#b00" }}>{error.title}</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>{error.message}</pre>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #b00", background: "#fff0f0", color: "#b00", cursor: "pointer" }}
              onClick={() => {
                navigator.clipboard.writeText(error.message);
              }}
            >
              Copy error
            </button>
            <button
              type="button"
              style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #888", background: "#f8f8f8", color: "#222", cursor: "pointer" }}
              onClick={error.retry}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {report && (
        <div style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: "8px 0 0" }}>Pivot Report</h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {report.headers?.White} vs {report.headers?.Black} — {report.headers?.Result}
          </div>

          {report.pivotal_moments?.length ? report.pivotal_moments.map((m, idx) => (
            <MomentCard m={m} />
          )) : (
            <div style={{ opacity: 0.75 }}>
              No pivotal moments found. Try lowering Threshold (cp) or Min ply gap.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
