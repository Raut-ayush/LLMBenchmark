from benchmark.monitor import (
    get_system_info
)

from benchmark.ollama_client import (
    generate
)

import json
from datetime import datetime


def run_benchmark(model, prompt):

    print("\n=== BASELINE ===")

    baseline = get_system_info()

    print(baseline)

    print("\n=== RUNNING MODEL ===")

    result = generate(
        model,
        prompt
    )

    loaded = get_system_info()

    print(loaded)

    benchmark = {

        "timestamp":
            str(datetime.now()),

        "baseline":
            baseline,

        "loaded":
            loaded,

        "ollama":
            result
    }

    filename = (
        f"results/"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )

    with open(
        filename,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            benchmark,
            f,
            indent=4
        )

    return benchmark