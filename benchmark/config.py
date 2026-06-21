from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal


DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
MODEL = "qwen2.5-coder:3b"
RESULTS_DIR = Path("results")
DATABASE_PATH = RESULTS_DIR / "benchmarks.db"


@dataclass(slots=True)
class GenerationOptions:
    temperature: float = 0.0
    seed: int = 42
    num_predict: int = 1000
    num_ctx: int = 4096
    top_p: float = 0.9
    top_k: int = 40

    def to_ollama(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class BenchmarkConfig:
    models: list[str]
    prompts: list[str]
    suite: str = "custom"
    mode: Literal["cold", "warm", "both"] = "both"
    repetitions: int = 3
    timeout: float = 900.0
    sample_interval: float = 0.2
    keep_alive: str = "5m"
    ollama_url: str = DEFAULT_OLLAMA_URL
    results_dir: Path = field(default_factory=lambda: RESULTS_DIR)
    generation: GenerationOptions = field(default_factory=GenerationOptions)

    def validate(self) -> None:
        if not self.models:
            raise ValueError("At least one model is required")
        if not self.prompts:
            raise ValueError("At least one prompt is required")
        if self.repetitions < 1:
            raise ValueError("Repetitions must be at least 1")
        if self.sample_interval <= 0:
            raise ValueError("Sample interval must be greater than 0")

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["results_dir"] = str(self.results_dir)
        return data
