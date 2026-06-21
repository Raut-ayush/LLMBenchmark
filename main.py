from benchmark.runner import (
    run_benchmark
)

MODEL = (
    "qwen2.5-coder:7b"
)

PROMPT = "Hello"

summary = run_benchmark(
    MODEL,
    PROMPT
)

print(
    "\n===== SUMMARY ====="
)

for k, v in summary.items():

    print(
        f"{k}: {v}"
    )