from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def list_suites(prompts_dir: Path = PROMPTS_DIR) -> list[str]:
    return sorted(path.stem for path in prompts_dir.glob("*.json"))


def load_suite(name: str, prompts_dir: Path = PROMPTS_DIR) -> list[dict[str, Any]]:
    path = prompts_dir / f"{name}.json"
    if not path.exists():
        raise ValueError(f"Unknown prompt suite: {name}")
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list) or not data:
        raise ValueError(f"Prompt suite {name} must contain a non-empty JSON list")
    normalized = []
    for index, item in enumerate(data, start=1):
        if isinstance(item, str):
            normalized.append({"id": f"{name}-{index}", "prompt": item})
        elif isinstance(item, dict) and isinstance(item.get("prompt"), str):
            normalized.append({"id": item.get("id", f"{name}-{index}"), **item})
        else:
            raise ValueError(f"Invalid prompt at index {index} in suite {name}")
    return normalized
