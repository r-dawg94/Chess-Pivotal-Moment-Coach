"use client";

export default function MomentCard({ m }: { m: any }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div><b>Ply {m.ply}</b> • {m.side_to_move} to move</div>
        <div style={{ opacity: 0.8 }}><b>{m.severity}</b> • Δ {m.delta_cp}</div>
      </div>
      <div style={{ marginTop: 6 }}>
        Played: <b>{m.played_san}</b> • Best: <b>{m.best_san}</b>
      </div>
      <div style={{ marginTop: 6, opacity: 0.9 }}>
        PV: {Array.isArray(m.pv_san) ? m.pv_san.join(" ") : ""}
      </div>
    </div>
  );
}
