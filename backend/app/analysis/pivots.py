

from typing import Optional, List
import chess
import chess.engine
import chess.pgn
import io
import logging
import time
from app.schemas import PVMove, CandidateLine, PivotMoment
from app.analysis.engine import analyze_multipv, open_engine, score_to_white_cp

def detect_pivots(
    pgn_text: str,
    depth: int,
    max_pivots: int,
    threshold_cp: int,
    min_ply_gap: int,
    multipv: int = 1,
    pv_len: int = 4
) -> List[PivotMoment]:
    logger = logging.getLogger(__name__)
    t0 = time.time()
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    logger.info(f"detect_pivots: moves={len(list(game.mainline_moves()))}")
    if game is None:
        logger.info("detect_pivots: game is None")
        return []
    board = game.board()
    moves = []
    evals = []
    logger.info(f"detect_pivots: opening engine {time.time()-t0:.3f}s")
    with open_engine() as engine:
        # Initial eval
        info0 = engine.analyse(board, chess.engine.Limit(depth=depth, time=0.25), multipv=1)
        if isinstance(info0, list):
            info0 = info0[0]
        evals.append(score_to_white_cp(info0["score"]))
        node = game
        while node.variations:
            node = node.variation(0)
            mv = node.move
            moves.append(mv)
            board.push(mv)
            info = engine.analyse(board, chess.engine.Limit(depth=depth, time=0.25), multipv=1)
            if isinstance(info, list):
                info = info[0]
            evals.append(score_to_white_cp(info["score"]))
    # Find candidate pivots
    candidates = []
    for i in range(1, len(evals)):
        if evals[i] is None or evals[i-1] is None:
            continue
        delta = evals[i] - evals[i-1]
        cross = (evals[i] >= 0 > evals[i-1]) or (evals[i] <= 0 < evals[i-1])
        if abs(delta) >= threshold_cp or cross:
            candidates.append((i, delta))
    pivots: List[PivotMoment] = []
    for idx, (i, delta) in enumerate(candidates):
        board = game.board()
        node = game
        for k in range(i-1):
            node = node.variation(0)
            board.push(node.move)
        played_move = moves[i-1]
        san_played = board.san(played_move)
        uci_played = played_move.uci()
        fen_before = board.fen()
        logger.info(f"detect_pivots: analyzing ply={i} idx={idx}")
        with open_engine() as engine:
            pv_best, candidates_list, uci_best, eval_after_best = analyze_multipv(
                board, engine, depth=depth, multipv=multipv, pv_len=pv_len, time_limit=0.25)
        logger.info(f"detect_pivots: analyze_multipv done ply={i} pv_best_len={len(pv_best)} candidates_len={len(candidates_list)}")
        # Fallback for uci_best/san_best
        if not uci_best:
            uci_best = uci_played
            # Generate played line: apply played move, then run multipv
            board_played = board.copy()
            board_played.push(played_move)
            pv_played, candidates_played, _, _ = analyze_multipv(
                board_played, engine, depth=depth, multipv=multipv, pv_len=pv_len, time_limit=0.25)
        san_best = board.san(chess.Move.from_uci(uci_best)) if uci_best else None
        if not san_best:
            san_best = san_played
        eval_before = evals[i-1]
        eval_after_played = evals[i]
        pivots.append(PivotMoment(
            ply=i,
            side_to_move="White" if board.turn else "Black",
            fen_before=fen_before,
            uci_played=uci_played or None,
            san_played=san_played or None,
            uci_best=uci_best or "",
            san_best=san_best or "",
            eval_before_cp=eval_before if eval_before is not None else None,
            eval_after_played_cp=eval_after_played if eval_after_played is not None else None,
            eval_after_best_cp=eval_after_best if eval_after_best is not None else None,
            pv_best=pv_best if pv_best is not None else [],
            candidates=[c for c in candidates_list if len(c.pv) >= 4] if candidates_list is not None else [],
            why_bad=None,
            what_instead=None,
            why_instead=None,
            remember=None
            pv_played=pv_played,
            candidates_played=candidates_played,
        ))
    pivots.sort(key=lambda c: abs((c.eval_after_played_cp or 0) - (c.eval_before_cp or 0)), reverse=True)
    selected: List[PivotMoment] = []
    for c in pivots:
        if len(selected) >= max_pivots:
            break
        if all(abs(c.ply - s.ply) >= min_ply_gap for s in selected):
            selected.append(c)
    logger.info(f"detect_pivots: done pivots={len(selected)} total_time={time.time()-t0:.3f}s")
    return selected

def _san(board: chess.Board, move: chess.Move) -> str:
    return board.san(move)


def get_multipv_candidates(board: chess.Board, k=3, depth=12) -> List[CandidateLine]:
    # TODO: Implement MultiPV extraction from engine
    return []
