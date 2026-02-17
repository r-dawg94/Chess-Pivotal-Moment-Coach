import os
from typing import Optional
import chess
import chess.engine

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

def open_engine() -> chess.engine.SimpleEngine:
    return chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

def score_to_white_cp(score: chess.engine.PovScore) -> Optional[int]:
    s = score.white()
    if s.is_mate():
        m = s.mate()
        if m is None:
            return None
        return 100000 if m > 0 else -100000
    return s.score(mate_score=100000)
