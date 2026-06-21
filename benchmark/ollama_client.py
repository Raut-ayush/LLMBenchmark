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

    def __init__(
        self,
        base_url: str,
        timeout: float = 900.0
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # ---------------------------------------------------------
    # Internal GET helper
    # ---------------------------------------------------------

    def _get(
        self,
        path: str
    ) -> dict[str, Any]:

        try:

            response = requests.get(
                f"{self.base_url}{path}",
                timeout=10
            )

            response.raise_for_status()

            return response.json()

        except (requests.RequestException, ValueError) as exc:

            raise OllamaError(
                f"Ollama request failed: {exc}"
            ) from exc

    # ---------------------------------------------------------
    # Health Check
    # ---------------------------------------------------------

    def health_check(self) -> bool:

        try:

            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )

            return response.status_code == 200

        except Exception:

            return False

    # ---------------------------------------------------------
    # Model List
    # ---------------------------------------------------------

    def list_models(self) -> list[dict[str, Any]]:

        return self._get(
            "/api/tags"
        ).get(
            "models",
            []
        )

    # ---------------------------------------------------------
    # Version
    # ---------------------------------------------------------

    def version(self) -> str | None:

        try:

            return self._get(
                "/api/version"
            ).get(
                "version"
            )

        except OllamaError:

            return None

    # ---------------------------------------------------------
    # Model Details
    # ---------------------------------------------------------

    def show_model(
        self,
        model: str
    ) -> dict[str, Any]:

        try:

            response = requests.post(
                f"{self.base_url}/api/show",
                json={"model": model},
                timeout=30
            )

            response.raise_for_status()

            return response.json()

        except (requests.RequestException, ValueError) as exc:

            raise OllamaError(
                f"Could not inspect model {model}: {exc}"
            ) from exc

    # ---------------------------------------------------------
    # Unload Model
    # ---------------------------------------------------------

    def unload(
        self,
        model: str
    ) -> None:

        payload = {
            "model": model,
            "prompt": "",
            "stream": False,
            "keep_alive": 0
        }

        try:

            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60
            )

            response.raise_for_status()

        except requests.RequestException as exc:

            raise OllamaError(
                f"Could not unload model {model}: {exc}"
            ) from exc

    # ---------------------------------------------------------
    # Generate
    # ---------------------------------------------------------

    def generate(
        self,
        model: str,
        prompt: str,
        options: dict[str, Any],
        keep_alive: str,
        on_token: Callable[[str], None] | None = None,
    ) -> GenerationResult:

        if not self.health_check():

            raise OllamaError(
                "\nOllama server is not running.\n"
                "Start it using:\n\n"
                "ollama serve\n"
            )

        url = f"{self.base_url}/api/generate"

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "options": options,
            "keep_alive": keep_alive,
        }

        print("\n" + "=" * 60)
        print("OLLAMA DEBUG")
        print("=" * 60)
        print("URL:", url)
        print("MODEL:", model)
        print("KEEP_ALIVE:", keep_alive)
        print("TIMEOUT:", self.timeout)
        print("OPTIONS:", options)
        print("PAYLOAD:")
        print(json.dumps(payload, indent=4))
        print("=" * 60 + "\n")

        started = time.perf_counter()

        first_token_at = None

        chunks = []

        final = {}

        try:

            response = requests.post(
                url,
                json=payload,
                stream=True,
                timeout=(10, self.timeout),
            )

            print(
                f"HTTP STATUS: {response.status_code}"
            )

            response.raise_for_status()

            for raw_line in response.iter_lines():

                if not raw_line:
                    continue

                item = json.loads(raw_line)

                if item.get("error"):

                    raise OllamaError(
                        str(item["error"])
                    )

                token = item.get(
                    "response",
                    ""
                )

                if token:

                    if first_token_at is None:

                        first_token_at = (
                            time.perf_counter()
                        )

                        print(
                            f"FIRST TOKEN: "
                            f"{first_token_at - started:.2f} sec"
                        )

                    chunks.append(token)

                    if on_token:
                        on_token(token)

                if item.get("done"):

                    final = item

            response.close()

        except Exception as exc:

            print("\nEXCEPTION")
            print(type(exc).__name__)
            print(exc)
            print()

            raise OllamaError(
                f"Generation failed for {model}: {exc}"
            ) from exc

        ended = time.perf_counter()

        if not final:

            raise OllamaError(
                f"Ollama ended stream without metrics for {model}"
            )

        return GenerationResult(
            response="".join(chunks),
            metrics=final,
            time_to_first_token_sec=(
                round(
                    first_token_at - started,
                    4
                )
                if first_token_at
                else None
            ),
            wall_time_sec=round(
                ended - started,
                4
            ),
        )


# -------------------------------------------------------------
# Compatibility Wrapper
# -------------------------------------------------------------

def generate(
    model: str,
    prompt: str
) -> dict[str, Any]:

    result = OllamaClient(
        "http://127.0.0.1:11434"
    ).generate(
        model=model,
        prompt=prompt,
        options={},
        keep_alive="5m"
    )

    return {
        **result.metrics,
        "response": result.response
    }