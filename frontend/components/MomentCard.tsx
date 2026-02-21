import InteractiveBoard from "./InteractiveBoard";
"use client";

export default function MomentCard({ m }: { m: any }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div><b>Ply {m.ply}</b> • {m.side_to_move} to move</div>
        <div style={{ opacity: 0.8 }}><b>{m.severity}</b> • Δ {m.delta_cp}</div>
      </div>
      <div style={{ marginTop: 10 }}>
        <InteractiveBoard
          fen={m.fen_before}
          pvMoves={m.pv_best || []}
          pvPlayedMoves={m.pv_played || []}
          candidatesBest={m.candidates || []}
          candidatesPlayed={m.candidates_played || []}
          title="Best line (Stockfish)"
        />
    </div>
  );
}
