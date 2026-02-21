"use client";
import InteractiveBoard from "./InteractiveBoard";

export default function MomentCard({ m }: { m: any }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div><b>Ply {m.ply}</b> • {m.side_to_move} to move</div>
      </div>
      <div style={{ marginTop: 8 }}>
        <b>Played:</b> <code>{m.san_played || "?"}</code> &nbsp;
        <b>Best:</b> <code>{m.san_best || "?"}</code>
      </div>
      <div style={{ marginTop: 10 }}>
        <InteractiveBoard
          fen={m.fen_before}
          pvMoves={m.pv_best || []}
          pvPlayedMoves={m.pv_played || []}
            {/* Legacy fields removed; only new schema fields rendered */}
          candidatesPlayed={m.candidates_played || []}
        />
      </div>
    </div>
  );
}
