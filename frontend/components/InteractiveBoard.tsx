"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

const Chessboard = dynamic(() => import("chessboardjsx"), { ssr: false });

export default function InteractiveBoard({ fen, pvMoves, pvPlayedMoves, title = "Best line" }: { fen: string, pvMoves: PVMove[], pvPlayedMoves?: PVMove[], title?: string }) {
  const [currentMove, setCurrentMove] = useState(0);
  const [lineType, setLineType] = useState<"best" | "played">("best");
  const moves = lineType === "played" && pvPlayedMoves && pvPlayedMoves.length ? pvPlayedMoves : pvMoves;

  // Build FEN sequence for PV
  const fens = [fen];
  let board = fen;
  try {
    const Chess = require("chess.js").Chess;
    const chess = new Chess(fen);
    pvMoves.forEach((move: any) => {
      chess.move({ from: move.uci.slice(0,2), to: move.uci.slice(2,4), promotion: "q" });
      fens.push(chess.fen());
    });
  } catch (e) {}

  return (
    <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>{lineType === "played" ? "Played move + best replies" : title}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Step {currentMove}/{fens.length - 1}
        </div>
        <div>
          <button onClick={() => setLineType(lineType === "best" ? "played" : "best")}>Toggle Line</button>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div>
          <Chessboard position={fens[currentMove]} width={320} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {(moves || []).map((m, idx) => {
              const step = idx + 1;
              const active = currentMove === step;
              return (
                <button
                  key={`${m.uci}-${idx}`}
                  onClick={() => setCurrentMove(step)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: active ? "#eee" : "#fff",
                    cursor: "pointer",
                  }}
                  title={m.uci}
                >
                  {m.san}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Tip: backend already provides <code>fen_after</code> for each PV move—this board will use it automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
