import requests

OLLAMA_URL = (
    "http://127.0.0.1:11434/api/generate"
)


def generate(model, prompt):

    print(
        "\nSending request to Ollama..."
    )

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        },
        timeout=600
    )

    print(
        "Response received"
    )

    return response.json()