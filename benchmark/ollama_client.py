from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Callable

import requests


class OllamaError(RuntimeError):
    pass


@dataclass(slots=True)
class GenerationResult:
    response: str
    metrics: dict[str, Any]
    time_to_first_token_sec: float | None
    wall_time_sec: float


class OllamaClient:
    def __init__(self, base_url: str, timeout: float = 900.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _get(self, path: str) -> dict[str, Any]:
        try:
            response = requests.get(f"{self.base_url}{path}", timeout=10)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            raise OllamaError(f"Ollama request failed: {exc}") from exc

    def list_models(self) -> list[dict[str, Any]]:
        return self._get("/api/tags").get("models", [])

    def version(self) -> str | None:
        try:
            return self._get("/api/version").get("version")
        except OllamaError:
            return None

    def show_model(self, model: str) -> dict[str, Any]:
        try:
            response = requests.post(
                f"{self.base_url}/api/show", json={"model": model}, timeout=30
            )
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            raise OllamaError(f"Could not inspect model {model}: {exc}") from exc

    def unload(self, model: str) -> None:
        payload = {"model": model, "prompt": "", "stream": False, "keep_alive": 0}
        try:
            response = requests.post(
                f"{self.base_url}/api/generate", json=payload, timeout=60
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise OllamaError(f"Could not unload model {model}: {exc}") from exc

    def generate(
        self,
        model: str,
        prompt: str,
        options: dict[str, Any],
        keep_alive: str,
        on_token: Callable[[str], None] | None = None,
    ) -> GenerationResult:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "options": options,
            "keep_alive": keep_alive,
        }
        started = time.perf_counter()
        first_token_at: float | None = None
        chunks: list[str] = []
        final: dict[str, Any] = {}

        try:
            with requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                stream=True,
                timeout=(10, self.timeout),
            ) as response:
                response.raise_for_status()
                for raw_line in response.iter_lines():
                    if not raw_line:
                        continue
                    item = json.loads(raw_line)
                    if item.get("error"):
                        raise OllamaError(str(item["error"]))
                    token = item.get("response", "")
                    if token:
                        if first_token_at is None:
                            first_token_at = time.perf_counter()
                        chunks.append(token)
                        if on_token:
                            on_token(token)
                    if item.get("done"):
                        final = item
        except (requests.RequestException, json.JSONDecodeError) as exc:
            raise OllamaError(f"Generation failed for {model}: {exc}") from exc

        ended = time.perf_counter()
        if not final:
            raise OllamaError(f"Ollama ended the stream for {model} without metrics")
        return GenerationResult(
            response="".join(chunks),
            metrics=final,
            time_to_first_token_sec=(
                round(first_token_at - started, 4) if first_token_at else None
            ),
            wall_time_sec=round(ended - started, 4),
        )


# Compatibility wrapper for callers of the original API.
def generate(model: str, prompt: str) -> dict[str, Any]:
    result = OllamaClient("http://127.0.0.1:11434").generate(
        model, prompt, {}, "5m"
    )
    return {**result.metrics, "response": result.response}
