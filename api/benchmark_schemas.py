from __future__ import annotations

from pydantic import BaseModel
from typing import Literal, Optional


class RunBenchmarkRequest(BaseModel):
    model: str
    prompt_id: str
    mode: Literal["cold", "warm", "both"] = "warm"

    # UI controls (kept minimal for phase 3; backend uses its own generation defaults)
    ctx: int = 4096
    maxTokens: int = 1000
    temperature: float = 0.7
    repetitions: int = 1
    interval: float = 0.5


class BenchmarkRunResponse(BaseModel):
    session_id: str
    status: str
    created_at: Optional[str] = None

