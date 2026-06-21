def parse_ollama_metrics(data):

    load_time = (
        data.get(
            "load_duration",
            0
        ) / 1e9
    )

    prompt_tokens = data.get(
        "prompt_eval_count",
        0
    )

    output_tokens = data.get(
        "eval_count",
        0
    )

    prompt_time = (
        data.get(
            "prompt_eval_duration",
            0
        ) / 1e9
    )

    generation_time = (
        data.get(
            "eval_duration",
            0
        ) / 1e9
    )

    total_time = (
        data.get(
            "total_duration",
            0
        ) / 1e9
    )

    prompt_tps = (
        prompt_tokens / prompt_time
        if prompt_time > 0
        else 0
    )

    generation_tps = (
        output_tokens /
        generation_time
        if generation_time > 0
        else 0
    )

    return {

        "load_time_sec":
            round(load_time, 2),

        "prompt_tokens":
            prompt_tokens,

        "output_tokens":
            output_tokens,

        "total_tokens":
            prompt_tokens +
            output_tokens,

        "prompt_tps":
            round(prompt_tps, 2),

        "generation_tps":
            round(
                generation_tps,
                2
            ),

        "total_time_sec":
            round(total_time, 2)
    }