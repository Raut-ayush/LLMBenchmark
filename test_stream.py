import requests

response = requests.post(
    "http://127.0.0.1:8000/chat/stream",
    json={
        "model": "qwen2.5-coder:3b",
        "message": "Tell me about STM32"
    },
    stream=True
)

for line in response.iter_lines():

    if line:
        print(line.decode())