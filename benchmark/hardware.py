from __future__ import annotations

import os
import platform
import subprocess
from typing import Any

import psutil


def _gpu_inventory() -> list[dict[str, Any]]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,name,driver_version,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        gpus = []
        for line in result.stdout.strip().splitlines():
            index, name, driver, memory = [item.strip() for item in line.split(",", 3)]
            gpus.append(
                {
                    "index": int(index),
                    "name": name,
                    "driver_version": driver,
                    "memory_total_mb": float(memory),
                }
            )
        return gpus
    except (OSError, subprocess.SubprocessError, ValueError):
        return []


def collect_hardware_info() -> dict[str, Any]:
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()
    return {
        "hostname": platform.node(),
        "os": platform.platform(),
        "python_version": platform.python_version(),
        "cpu": platform.processor() or os.environ.get("PROCESSOR_IDENTIFIER", "unknown"),
        "physical_cores": psutil.cpu_count(logical=False),
        "logical_cores": psutil.cpu_count(logical=True),
        "ram_total_gb": round(memory.total / 1024**3, 3),
        "swap_total_gb": round(swap.total / 1024**3, 3),
        "gpus": _gpu_inventory(),
    }
