from __future__ import annotations

import statistics
from typing import Any


def _seconds(data: dict[str, Any], key: str) -> float:
    return float(data.get(key, 0) or 0) / 1e9


def parse_ollama_metrics(data: dict[str, Any]) -> dict[str, Any]:
    load_time = _seconds(data, "load_duration")
    prompt_time = _seconds(data, "prompt_eval_duration")
    generation_time = _seconds(data, "eval_duration")
    total_time = _seconds(data, "total_duration")
    prompt_tokens = int(data.get("prompt_eval_count", 0) or 0)
    output_tokens = int(data.get("eval_count", 0) or 0)
    return {
        "load_time_sec": round(load_time, 4),
        "prompt_tokens": prompt_tokens,
        "output_tokens": output_tokens,
        "total_tokens": prompt_tokens + output_tokens,
        "prompt_eval_time_sec": round(prompt_time, 4),
        "generation_time_sec": round(generation_time, 4),
        "prompt_tps": round(prompt_tokens / prompt_time, 3) if prompt_time else 0,
        "generation_tps": (
            round(output_tokens / generation_time, 3) if generation_time else 0
        ),
        "total_time_sec": round(total_time, 4),
    }


def summarize_samples(samples: list[dict[str, Any]]) -> dict[str, Any]:
    if not samples:
        return {}
    result: dict[str, Any] = {"sample_count": len(samples)}
    mappings = {
        "cpu_percent": "cpu_percent",
        "ram_used_gb": "ram_used_gb",
        "ram_percent": "ram_percent",
        "swap_used_gb": "swap_used_gb",
        "gpu_util_percent": "gpu_util_percent",
        "gpu_memory_mb": "gpu_memory_mb",
        "gpu_temp_c": "gpu_temp_c",
        "gpu_power_w": "gpu_power_w",
    }
    for source, target in mappings.items():
        values = [float(s[source]) for s in samples if s.get(source) is not None]
        result[f"avg_{target}"] = round(statistics.fmean(values), 3) if values else None
        result[f"peak_{target}"] = round(max(values), 3) if values else None
    return result


def aggregate_trials(trials: list[dict[str, Any]]) -> dict[str, Any]:
    completed = [t for t in trials if t.get("status") == "completed"]
    summary: dict[str, Any] = {
        "trial_count": len(trials),
        "completed_count": len(completed),
        "failed_count": len(trials) - len(completed),
    }
    keys = (
        "generation_tps",
        "prompt_tps",
        "time_to_first_token_sec",
        "total_time_sec",
        "wall_time_sec",
        "load_time_sec",
        "peak_ram_used_gb",
        "peak_gpu_memory_mb",
        "avg_gpu_util_percent",
        "avg_cpu_percent",
    )
    for key in keys:
        values = [float(t[key]) for t in completed if t.get(key) is not None]
        if values:
            summary[key] = {
                "mean": round(statistics.fmean(values), 3),
                "median": round(statistics.median(values), 3),
                "min": round(min(values), 3),
                "max": round(max(values), 3),
                "stdev": round(statistics.stdev(values), 3) if len(values) > 1 else 0,
            }
    return summary
