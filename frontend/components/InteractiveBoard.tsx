"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
const Chessboard = require("chessboardjsx").default;
type PVMove = { uci: string; san: string; fen_after?: string };
type CandidateLine = { uci: string; san: string; eval_cp?: number | null; pv: PVMove[] };

export default function InteractiveBoard({
  fen,
  pvMoves,
  pvPlayedMoves,
  candidatesBest,
  candidatesPlayed,
  title = "Best line"
}: {
  fen: string,
  pvMoves: PVMove[],
  pvPlayedMoves?: PVMove[],
  candidatesBest?: CandidateLine[],
  candidatesPlayed?: CandidateLine[],
  title?: string
}) {
  const [currentMove, setCurrentMove] = useState(0);
  const [lineType, setLineType] = useState<"best" | "played">("best");
  const [candIndex, setCandIndex] = useState(0);

  // Reset currentMove when lineType or candIndex changes
  useEffect(() => {
    setCurrentMove(0);
  }, [lineType, candIndex]);

  // Derive candidates
  const cands = lineType === "played" ? (candidatesPlayed || []) : (candidatesBest || []);
  const activeCand = cands[candIndex] || null;
  const moves = activeCand?.pv?.length ? activeCand.pv : (lineType === "played" ? (pvPlayedMoves || []) : pvMoves);

  // Build FEN sequence for PV using fen_after if present, else chess.js
  const fens = useMemo(() => {
    const out = [fen];
    let board = fen;
    let useChess = false;
    if (moves.length > 0) {
      // Check if all moves have fen_after
      if (moves.every(m => m.fen_after)) {
        moves.forEach((m) => {
          out.push(m.fen_after!);
        });
      } else {
        useChess = true;
      }
    }
    if (useChess) {
      try {
        const Chess = require("chess.js").Chess;
        const chess = new Chess(fen);
        moves.forEach((move: any) => {
          chess.move({ from: move.uci.slice(0,2), to: move.uci.slice(2,4), promotion: "q" });
          out.push(chess.fen());
        });
      } catch (e) {}
    }
    return out;
  }, [fen, moves]);

  // Guard: currentMove never exceeds fens.length-1
  useEffect(() => {
    if (currentMove > fens.length - 1) {
      setCurrentMove(fens.length - 1);
    }
  }, [currentMove, fens]);
  return (
    <div style={{ marginTop: 10, padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>{lineType === "played" ? "Played move + best replies" : title}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Step {currentMove}/{fens.length - 1}
        </div>
        <div>
          <button
            onClick={() => {
              setLineType(lineType === "best" ? "played" : "best");
              setCandIndex(0);
              setCurrentMove(0);
            }}
          >Toggle Line</button>
        </div>
        {cands.length > 0 && (
          <select
            value={candIndex}
            onChange={e => {
              setCandIndex(Number(e.target.value));
              setCurrentMove(0);
            }}
            style={{ marginLeft: 10 }}
          >
            {cands.map((c, idx) => (
              <option key={c.uci} value={idx}>
                {`${idx + 1}. ${c.san} (${c.eval_cp ?? "N/A"})`}
              </option>
            ))}
          </select>
        )}
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
            {activeCand && (
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                Eval: {activeCand.eval_cp ?? "N/A"}
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Tip: backend already provides <code>fen_after</code> for each PV move—this board will use it automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
