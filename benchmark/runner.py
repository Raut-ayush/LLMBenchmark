import json
import os

from datetime import datetime

from benchmark.monitor import (
    HardwareMonitor
)

from benchmark.metrics import (
    parse_ollama_metrics
)

from benchmark.ollama_client import (
    generate
)


def run_benchmark(
    model,
    prompt
):

    os.makedirs(
        "results",
        exist_ok=True
    )

    monitor = HardwareMonitor()

    print(
        "\nStarting monitor..."
    )

    monitor.start()

    result = generate(
        model,
        prompt
    )

    monitor.stop()

    metrics = (
        parse_ollama_metrics(
            result
        )
    )

    peak_cpu = max(
        x["cpu_percent"]
        for x in monitor.samples
    )

    avg_cpu = round(
        sum(
            x["cpu_percent"]
            for x in monitor.samples
        )
        /
        len(
            monitor.samples
        ),
        2
    )

    peak_ram = max(
        x["ram_used_gb"]
        for x in monitor.samples
    )

    peak_gpu = max(
        x["gpu_util"]
        for x in monitor.samples
    )

    peak_gpu_mem = max(
        x["gpu_memory_mb"]
        for x in monitor.samples
    )

    peak_temp = max(
        x["gpu_temp"]
        for x in monitor.samples
    )

    peak_power = max(
        x["gpu_power_w"]
        for x in monitor.samples
    )

    summary = {

        "model": model,

        **metrics,

        "avg_cpu":
            avg_cpu,

        "peak_cpu":
            peak_cpu,

        "peak_ram_gb":
            peak_ram,

        "peak_gpu":
            peak_gpu,

        "peak_gpu_memory_mb":
            peak_gpu_mem,

        "peak_gpu_temp":
            peak_temp,

        "peak_gpu_power_w":
            peak_power
    }

    timestamp = (
        datetime.now()
        .strftime(
            "%Y%m%d_%H%M%S"
        )
    )

    monitor.save_csv(
        f"results/hardware_{timestamp}.csv"
    )

    with open(
        f"results/summary_{timestamp}.json",
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            summary,
            f,
            indent=4
        )

    with open(
        f"results/benchmark_{timestamp}.json",
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            result,
            f,
            indent=4
        )

    return summary