import os, json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

REPORT_SCHEMA = {
  "name": "chess_coach_report",
  "schema": {
    "type": "object",
    "properties": {
      "summary": {"type": "string"},
      "turning_points": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "ply": {"type": "integer"},
            "title": {"type": "string"},
            "what_happened": {"type": "string"},
            "why_it_matters": {"type": "string"},
            "try_this_next_time": {"type": "string"},
            "pv_in_words": {"type": "string"}
          },
          "required": ["ply","title","what_happened","why_it_matters","try_this_next_time","pv_in_words"],
          "additionalProperties": False
        }
      },
      "themes": {"type": "array", "items": {"type": "string"}},
      "training_plan": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "drill": {"type": "string"},
            "how": {"type": "string"},
            "frequency": {"type": "string"}
          },
          "required": ["drill","how","frequency"],
          "additionalProperties": False
        }
      }
    },
    "required": ["summary","turning_points","themes","training_plan"],
    "additionalProperties": False
  }
}

def narrate(headers: dict, moment_cards: list[dict]) -> dict:
    instructions = (
        "You are a calm, practical chess coach. "
        "Use ONLY the provided headers and moment_cards. "
        "Do not invent moves, evaluations, or tactics not implied by the cards. "
        "Write in clear, human language. "
        "For each turning point: explain what went wrong/right, why it mattered, and one actionable rule-of-thumb. "
        "Keep it concise but helpful."
    )

    payload = {"headers": headers, "moment_cards": moment_cards}

    resp = client.responses.create(
        model="gpt-4o",
        instructions=instructions,
        input=[{"role": "user", "content": json.dumps(payload)}],
        response_format={
            "type": "json_schema",
            "json_schema": REPORT_SCHEMA,
            "strict": True
        }
    )

    # `output_text` is an SDK convenience containing the aggregated text output.
    # With json_schema, output_text should be a single JSON object string.
    text = getattr(resp, "output_text", None)
    if not text:
        # very defensive fallback
        text = json.dumps({"summary":"(no output)","turning_points":[],"themes":[],"training_plan":[]})
    return json.loads(text)
