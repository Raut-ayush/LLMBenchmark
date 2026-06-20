from benchmark.runner import (
    run_benchmark
)

MODEL = "qwen2.5-coder:7b"

PROMPT = """
Write a Linux character
device driver.
"""

result = run_benchmark(
    MODEL,
    PROMPT
)

print("\nDONE")