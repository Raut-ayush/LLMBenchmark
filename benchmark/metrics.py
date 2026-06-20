def calculate_metrics(response, time_taken):

    words = len(response.split())

    chars = len(response)

    words_per_second = (
        words / time_taken
        if time_taken > 0
        else 0
    )

    return {
        "words": words,
        "characters": chars,
        "words_per_second": round(
            words_per_second,
            2
        )
    }