from __future__ import annotations

import json
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from benchmark.config import BenchmarkConfig, DATABASE_PATH
from benchmark.hardware import collect_hardware_info
from benchmark.metrics import aggregate_trials, parse_ollama_metrics, summarize_samples
from benchmark.monitor import HardwareMonitor
from benchmark.ollama_client import OllamaClient
from benchmark.storage import BenchmarkStore


ProgressCallback = Callable[[str, dict[str, Any]], None]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit(callback: ProgressCallback | None, event: str, data: dict[str, Any]) -> None:
    if callback:
        callback(event, data)


class BenchmarkRunner:
    def __init__(self, config: BenchmarkConfig, store: BenchmarkStore | None = None):
        config.validate()
        self.config = config
        self.client = OllamaClient(config.ollama_url, config.timeout)
        self.store = store or BenchmarkStore(config.results_dir / DATABASE_PATH.name)

    def run(self, on_progress: ProgressCallback | None = None) -> dict[str, Any]:
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
        session_dir = self.config.results_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        session = {
            "id": session_id,
            "created_at": _now(),
            "config": self.config.to_dict(),
            "hardware": collect_hardware_info(),
            "ollama_version": self.client.version(),
        }
        self.store.create_session(session)
        trials: list[dict[str, Any]] = []
        _emit(on_progress, "session_started", session)

        try:
            for model in self.config.models:
                modes = ["cold", "warm"] if self.config.mode == "both" else [self.config.mode]
                if self.config.mode == "warm":
                    self._warm_up(model, self.config.prompts[0], on_progress)
                for prompt_index, prompt in enumerate(self.config.prompts, start=1):
                    prompt_id = f"{self.config.suite}-{prompt_index}"
                    for repetition in range(1, self.config.repetitions + 1):
                        for mode in modes:
                            trial = self._run_trial(
                                session_id, session_dir, model, prompt_id, prompt,
                                mode, repetition, on_progress,
                            )
                            trials.append(trial)
        finally:
            summary = self._build_summary(trials)
            status = "completed" if all(t["status"] == "completed" for t in trials) else "partial"
            finished_at = _now()
            self.store.finish_session(session_id, finished_at, status, summary)
            output = {**session, "finished_at": finished_at, "status": status, "summary": summary, "trials": trials}
            with (session_dir / "session.json").open("w", encoding="utf-8") as handle:
                json.dump(output, handle, indent=2)
            _emit(on_progress, "session_finished", output)
        return output

    def _warm_up(self, model: str, prompt: str, callback: ProgressCallback | None) -> None:
        _emit(callback, "warmup_started", {"model": model})
        self.client.generate(model, prompt, {**self.config.generation.to_ollama(), "num_predict": 1}, self.config.keep_alive)
        _emit(callback, "warmup_finished", {"model": model})

    def _run_trial(
        self, session_id: str, session_dir: Path, model: str, prompt_id: str,
        prompt: str, mode: str, repetition: int, callback: ProgressCallback | None,
    ) -> dict[str, Any]:
        trial_id = uuid.uuid4().hex
        trial_dir = session_dir / trial_id
        trial_dir.mkdir(parents=True, exist_ok=True)
        trial: dict[str, Any] = {
            "id": trial_id, "session_id": session_id, "model": model, "mode": mode,
            "prompt_id": prompt_id, "repetition": repetition, "status": "running",
            "started_at": _now(), "artifact_dir": str(trial_dir),
        }
        _emit(callback, "trial_started", trial)
        monitor = HardwareMonitor(self.config.sample_interval)
        try:
            if mode == "cold":
                self.client.unload(model)
                time.sleep(1)
            monitor.start()
            generated = self.client.generate(
                model, prompt, self.config.generation.to_ollama(), self.config.keep_alive
            )
            metrics = {
                **parse_ollama_metrics(generated.metrics),
                **summarize_samples(monitor.samples),
                "time_to_first_token_sec": generated.time_to_first_token_sec,
                "wall_time_sec": generated.wall_time_sec,
                "response_chars": len(generated.response),
            }
            trial.update(status="completed", metrics=metrics, response=generated.response)
            with (trial_dir / "raw_ollama.json").open("w", encoding="utf-8") as handle:
                json.dump({**generated.metrics, "response": generated.response}, handle, indent=2)
        except Exception as exc:  # A failed trial is data; continue the session.
            trial.update(status="failed", metrics={}, response="", error=str(exc))
        finally:
            monitor.stop()
            monitor.save_csv(trial_dir / "hardware.csv")
            trial["finished_at"] = _now()
            self.store.save_trial(trial)
            with (trial_dir / "trial.json").open("w", encoding="utf-8") as handle:
                json.dump(trial, handle, indent=2)
            _emit(callback, "trial_finished", trial)
        return trial

    @staticmethod
    def _build_summary(trials: list[dict[str, Any]]) -> dict[str, Any]:
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for trial in trials:
            groups[f'{trial["model"]}::{trial["mode"]}'].append({**trial.get("metrics", {}), "status": trial["status"]})
        return {key: aggregate_trials(items) for key, items in groups.items()}


def run_benchmark(model: str, prompt: str) -> dict[str, Any]:
    """Compatibility entry point returning a single-run summary."""
    config = BenchmarkConfig(models=[model], prompts=[prompt], mode="warm", repetitions=1)
    output = BenchmarkRunner(config).run()
    trial = output["trials"][0]
    return {"model": model, **trial.get("metrics", {}), "status": trial["status"]}
