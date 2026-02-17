import hashlib

def pgn_hash(pgn: str) -> str:
    # normalize whitespace lightly
    cleaned = "\n".join([line.rstrip() for line in pgn.strip().splitlines() if line.strip()])
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
