from __future__ import annotations

import csv
import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import psutil


class HardwareMonitor:
    def __init__(self, interval: float = 1.0):
        self.interval = interval
        self.samples: list[dict[str, Any]] = []
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._started_at = 0.0

    @staticmethod
    def get_gpu() -> dict[str, float | None]:
        empty = {
            "gpu_util_percent": None,
            "gpu_memory_mb": None,
            "gpu_temp_c": None,
            "gpu_power_w": None,
        }
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True,
                text=True,
                timeout=5,
                check=True,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            first_gpu = result.stdout.strip().splitlines()[0]
            values = [value.strip() for value in first_gpu.split(",")]
            parsed = [None if value in {"N/A", "[N/A]"} else float(value) for value in values]
            return dict(zip(empty, parsed))
        except (OSError, subprocess.SubprocessError, ValueError, IndexError):
            return empty

    def sample(self) -> None:
        ram = psutil.virtual_memory()
        swap = psutil.swap_memory()
        data: dict[str, Any] = {
            "timestamp": time.time(),
            "elapsed_sec": round(time.perf_counter() - self._started_at, 4),
            "cpu_percent": psutil.cpu_percent(interval=None),
            "ram_percent": ram.percent,
            "ram_used_gb": round(ram.used / 1024**3, 3),
            "swap_used_gb": round(swap.used / 1024**3, 3),
        }
        data.update(self.get_gpu())
        self.samples.append(data)

    def _loop(self) -> None:
        while not self._stop_event.is_set():
            self.sample()
            self._stop_event.wait(self.interval)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self.samples = []
        self._started_at = time.perf_counter()
        self._stop_event.clear()
        psutil.cpu_percent(interval=None)
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=max(5, self.interval * 2))

    def save_csv(self, filename: str | Path) -> None:
        if not self.samples:
            return
        path = Path(filename)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=self.samples[0].keys())
            writer.writeheader()
            writer.writerows(self.samples)
