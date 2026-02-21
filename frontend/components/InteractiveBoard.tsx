 "use client";
 import { useState, useEffect, useMemo } from "react";
const Chessboard = require("chessboardjsx").default;
import { Chess } from "chess.js";
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
    if (moves.length > 0 && moves.every(m => m.fen_after)) {
      moves.forEach((m) => {
        out.push(m.fen_after!);
      });
    } else if (moves.length > 0) {
      try {
        const chess = new Chess(fen);
        moves.forEach((move: any) => {
          const from = move.uci.slice(0,2);
          const to = move.uci.slice(2,4);
          const promotion = move.uci.length === 5 ? move.uci[4] : undefined;
          chess.move({ from, to, promotion });
          out.push(chess.fen());
        });
      } catch (e) {}
    }
    return out;
  }, [fen, moves]);
      <div style={{ marginTop: 10 }}>
        <button
          style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #ccc", fontWeight: 600, cursor: "pointer" }}
          onClick={() => {
            const pgnMoves = moves.slice(currentMove).map(m => m.san).join(" ");
            navigator.clipboard.writeText(pgnMoves);
          }}
        >
          Copy PGN-from-here
        </button>
      </div>

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
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentMove(currentMove - 1)}
              disabled={currentMove <= 0}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: currentMove <= 0 ? "#f5f5f5" : "#fff",
                cursor: currentMove <= 0 ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
              title="Back"
            >◀</button>
            <button
              onClick={() => setCurrentMove(currentMove + 1)}
              disabled={currentMove >= fens.length - 1}
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: currentMove >= fens.length - 1 ? "#f5f5f5" : "#fff",
                cursor: currentMove >= fens.length - 1 ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
              title="Forward"
            >▶</button>
            <span style={{ marginLeft: 12, fontSize: 15, fontWeight: 500 }}>
              {currentMove === 0
                ? "Start position"
                : moves[currentMove - 1]?.san || ""}
              {"eval_cp" in (moves[currentMove - 1] || {}) && typeof (moves[currentMove - 1] as any).eval_cp === "number"
                ? ` (Eval: ${(moves[currentMove - 1] as any).eval_cp})`
                : ""}
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Tip: backend already provides <code>fen_after</code> for each PV move—this board will use it automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
