import requests

OLLAMA_URL = \
"http://127.0.0.1:11434/api/generate"


def generate(model, prompt):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        }
    )

    return response.json()