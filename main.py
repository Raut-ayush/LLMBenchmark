from benchmark.runner import (
    run_benchmark
)

MODEL = (
    "qwen2.5-coder:3b"
)

PROMPT = """
Create a production-ready STM32 UART driver.

Requirements:

- C language
- STM32 HAL
- Interrupt support
- DMA support
- Ring buffer
- Error handling
- Header file
- Source file
- Example main.c

Explain every step in detail.
"""

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