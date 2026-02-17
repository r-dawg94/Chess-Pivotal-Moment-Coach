from dataclasses import dataclass, asdict
from typing import Optional, List, Tuple
import chess
import chess.engine
import chess.pgn

from .engine import score_to_white_cp

@dataclass
class MomentCard:
    ply: int
    side_to_move: str
    fen_before: str
    played_san: str
    best_san: str
    eval_before_cp: Optional[int]
    eval_after_cp: Optional[int]
    delta_cp: Optional[int]
    severity: str
    pv_san: List[str]

def _label(delta_cp: Optional[int]) -> str:
    if delta_cp is None:
        return "pivotal"
    d = abs(delta_cp)
    if d >= 250: return "blunder"
    if d >= 100: return "mistake"
    if d >= 50:  return "inaccuracy"
    return "pivotal"

def _san(board: chess.Board, move: chess.Move) -> str:
    return board.san(move)

def evaluate_timeline(game: chess.pgn.Game, engine: chess.engine.SimpleEngine, depth: int) -> tuple[list[Optional[int]], list[chess.Move]]:
    board = game.board()
    evals: list[Optional[int]] = []
    moves: list[chess.Move] = []

    info0 = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=1)
    evals.append(score_to_white_cp(info0["score"]))

    node = game
    while node.variations:
        node = node.variation(0)
        mv = node.move
        moves.append(mv)
        board.push(mv)

        info = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=1)
        evals.append(score_to_white_cp(info["score"]))

    return evals, moves

def detect_pivots(
    game: chess.pgn.Game,
    engine: chess.engine.SimpleEngine,
    depth: int,
    multipv: int,
    max_pivots: int,
    swing_threshold_cp: int,
    min_ply_gap: int
) -> list[dict]:
    evals, moves = evaluate_timeline(game, engine, depth)

    candidates: list[Tuple[int,int]] = []
    for i in range(1, len(evals)):
        if evals[i] is None or evals[i-1] is None:
            continue
        delta = evals[i] - evals[i-1]
        cross = (evals[i] >= 0 > evals[i-1]) or (evals[i] <= 0 < evals[i-1])
        if abs(delta) >= swing_threshold_cp or cross:
            candidates.append((i, delta))

    # build moment cards by re-analyzing BEFORE the pivot move
    cards: list[MomentCard] = []
    for i, delta in candidates:
        board = game.board()
        node = game
        for k in range(i-1):
            node = node.variation(0)
            board.push(node.move)

        played_move = moves[i-1]
        infos = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=multipv)
        best = infos[0]["pv"][0]
        pv_moves = infos[0]["pv"][:8]

        played_san = _san(board, played_move)
        best_san = _san(board, best)

        eval_before = evals[i-1]
        eval_after = evals[i]
        delta_cp = None if (eval_before is None or eval_after is None) else (eval_after - eval_before)
        severity = _label(delta_cp)

        pv_san: list[str] = []
        b2 = board.copy()
        for m in pv_moves:
            pv_san.append(_san(b2, m))
            b2.push(m)

        side_to_move = "White" if board.turn else "Black"

        cards.append(MomentCard(
            ply=i,
            side_to_move=side_to_move,
            fen_before=board.fen(),
            played_san=played_san,
            best_san=best_san,
            eval_before_cp=eval_before,
            eval_after_cp=eval_after,
            delta_cp=delta_cp,
            severity=severity,
            pv_san=pv_san
        ))

    # rank by magnitude then enforce spacing
    cards.sort(key=lambda c: abs(c.delta_cp or 0), reverse=True)
    selected: list[MomentCard] = []
    for c in cards:
        if len(selected) >= max_pivots:
            break
        if all(abs(c.ply - s.ply) >= min_ply_gap for s in selected):
            selected.append(c)

    return [asdict(c) for c in selected]
