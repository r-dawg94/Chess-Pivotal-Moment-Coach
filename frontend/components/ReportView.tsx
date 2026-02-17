"use client";

import MomentCard from "./MomentCard";

export default function ReportView({ report }: { report: any }) {
  const headers = report.headers || {};
  const moments = report.pivotal_moments || [];
  const coach = report.coach_report || {};

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Game</div>
        <div><b>White:</b> {headers.White || "?"} • <b>Black:</b> {headers.Black || "?"}</div>
        <div><b>Result:</b> {headers.Result || "?"} • <b>Date:</b> {headers.Date || "?"}</div>
        {headers.TimeControl && <div><b>Time control:</b> {headers.TimeControl}</div>}
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Coach summary</div>
        <div style={{ whiteSpace: "pre-wrap" }}>{coach.summary || "(No summary yet)"}</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Pivotal moments</div>
        {moments.map((m: any) => <MomentCard key={m.ply} m={m} />)}
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Turning points (narrated)</div>
        {(coach.turning_points || []).map((tp: any) => (
          <div key={tp.ply} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>Ply {tp.ply}: {tp.title}</div>
            <div><b>What happened:</b> {tp.what_happened}</div>
            <div><b>Why it matters:</b> {tp.why_it_matters}</div>
            <div><b>Try next time:</b> {tp.try_this_next_time}</div>
            <div style={{ opacity: 0.9 }}><b>PV (in words):</b> {tp.pv_in_words}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Themes</div>
        <ul>
          {(coach.themes || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
        </ul>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Training plan</div>
        <ul>
          {(coach.training_plan || []).map((d: any, i: number) => (
            <li key={i}>
              <b>{d.drill}</b> — {d.how} <i>({d.frequency})</i>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
