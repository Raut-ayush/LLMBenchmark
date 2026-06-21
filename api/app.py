from fastapi import FastAPI
import shutil
from api.schemas import ModelRequest, PullModelRequest
import subprocess
import psutil
import platform
from pydantic import BaseModel
from typing import List
from api.chat_store import SESSIONS
import uuid
import requests

OLLAMA_EXE = r"D:/Ollama/ollama.exe"

print("OLLAMA PATH =", OLLAMA_EXE)

MODEL_CATALOG = [
    {
        "name": "tinyllama",
        "parameters": "1.1B",
        "ram_required": 4,
        "vram_required": 2,
        "category": "chat"
    },
    {
        "name": "qwen2.5-coder:3b",
        "parameters": "3B",
        "ram_required": 8,
        "vram_required": 2,
        "category": "coding"
    },
    {
        "name": "qwen2.5-coder:7b",
        "parameters": "7B",
        "ram_required": 16,
        "vram_required": 4,
        "category": "coding"
    },
    {
        "name": "mistral:7b",
        "parameters": "7B",
        "ram_required": 16,
        "vram_required": 4,
        "category": "general"
    },
    {
        "name": "llama3:8b",
        "parameters": "8B",
        "ram_required": 16,
        "vram_required": 6,
        "category": "general"
    },
    {
        "name": "deepseek-coder:33b",
        "parameters": "33B",
        "ram_required": 64,
        "vram_required": 24,
        "category": "coding"
    }
]

class ChatRequest(BaseModel):
    model: str
    message: str

class Message(BaseModel):
    role: str
    content: str


class ChatHistoryRequest(BaseModel):
    model: str
    messages: List[Message]

class SessionCreate(BaseModel):
    model: str


class SessionMessage(BaseModel):
    session_id: str
    model: str
    message: str

app = FastAPI(
    title="Local LLMx API"
)

@app.get("/")
def root():
    return {
        "status": "running"
    }
    
@app.get("/health")
def health():
    return {
        "api": "ok"
    }
    
@app.get("/models")
def get_models():
    import requests

    response = requests.get(
        "http://127.0.0.1:11434/api/tags"
)

    return response.json()

@app.get("/models/running")
def running_models():

    import requests

    response = requests.get(
        "http://127.0.0.1:11434/api/ps"
    )

    data = response.json()

    return {
        "count": len(data.get("models", []))
        if isinstance(data.get("models"), list)
        else 0,
        "models": data.get("models", [])
    }
    
@app.post("/models/unload")
def unload_model(request: ModelRequest):

    import requests

    payload = {
        "model": request.model,
        "keep_alive": 0
    }

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json=payload
    )

    return {
        "success": True,
        "model": request.model
    }
    
@app.post("/models/pull")
def pull_model(request: PullModelRequest):

    if not OLLAMA_EXE:
        return {
            "success": False,
            "error": "Ollama not found"
        }

    subprocess.Popen(
        [
            OLLAMA_EXE,
            "pull",
            request.model
        ]
    )

    return {
        "success": True,
        "message": f"Started downloading {request.model}"
    }
    
@app.get("/system/info")
def system_info():

    ram_gb = round(
        psutil.virtual_memory().total / (1024**3),
        1
    )

    cpu_name = (
        subprocess.check_output(
            "wmic cpu get name",
            shell=True
        )
        .decode()
        .split("\n")[1]
        .strip()
    )

    gpu_name = "Unknown"
    gpu_vram = 0

    try:

        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits"
            ],
            capture_output=True,
            text=True
        )

        if result.stdout:

            line = result.stdout.strip().split("\n")[0]

            gpu_name, gpu_vram = [
                x.strip()
                for x in line.split(",")
            ]

    except:
        pass

    return {
        "cpu": cpu_name,
        "ram_gb": ram_gb,
        "gpu": gpu_name,
        "gpu_vram_mb": gpu_vram
    }
    
@app.get("/ollama/status")
def ollama_status():

    import requests
    import subprocess

    installed = OLLAMA_EXE is not None

    running = False
    version = None

    try:

        response = requests.get(
            "http://127.0.0.1:11434/api/version",
            timeout=2
        )

        if response.status_code == 200:

            running = True

            version = response.json().get(
                "version"
            )

    except:
        pass

    return {
        "installed": installed,
        "running": running,
        "version": version
    }
    
@app.get("/recommended-models")
def recommended_models():

    ram_gb = round(
        psutil.virtual_memory().total / (1024**3),
        1
    )

    gpu_vram_mb = 0

    try:

        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=memory.total",
                "--format=csv,noheader,nounits"
            ],
            capture_output=True,
            text=True
        )

        gpu_vram_mb = int(
            result.stdout.strip().split("\n")[0]
        )

    except:
        pass

    gpu_vram_gb = gpu_vram_mb / 1024

    recommendations = []

    for model in MODEL_CATALOG:

        recommended = (
            ram_gb >= model["ram_required"]
            and
            gpu_vram_gb >= model["vram_required"]
        )

        recommendations.append({
            **model,
            "recommended": recommended
        })

    return {
        "system": {
            "ram_gb": ram_gb,
            "gpu_vram_gb": round(gpu_vram_gb, 1)
        },
        "models": recommendations
    }
    
@app.post("/chat")
def chat(request: ChatRequest):

    import requests
    import time

    start = time.time()

    payload = {
        "model": request.model,
        "prompt": request.message,
        "stream": False
    }

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json=payload,
        timeout=600
    )

    data = response.json()

    return {
        "success": True,
        "model": request.model,
        "response": data.get("response"),
        "prompt_tokens": data.get("prompt_eval_count"),
        "output_tokens": data.get("eval_count"),
        "total_duration_sec":
            round(
                data.get("total_duration", 0)
                / 1_000_000_000,
                2
            ),
        "time_taken":
            round(
                time.time() - start,
                2
            )
    }
    
@app.post("/chat/history")
def chat_history(request: ChatHistoryRequest):

    import requests

    payload = {
        "model": request.model,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in request.messages
        ],
        "stream": False
    }

    response = requests.post(
        "http://127.0.0.1:11434/api/chat",
        json=payload,
        timeout=600
    )

    data = response.json()

    return {
        "success": True,
        "model": request.model,
        "response":
            data["message"]["content"]
    }
    
@app.post("/chat/session/create")
def create_session():

    session_id = uuid.uuid4().hex

    SESSIONS[session_id] = []

    return {
        "success": True,
        "session_id": session_id
    }
    
@app.get("/chat/sessions")
def list_sessions():

    return {
        "count": len(SESSIONS),
        "sessions": list(SESSIONS.keys())
    }
    
@app.post("/chat/session/message")
def session_message(data: SessionMessage):

    history = SESSIONS.get(
        data.session_id,
        []
    )

    history.append(
        {
            "role": "user",
            "content": data.message
        }
    )

    response = requests.post(
        "http://127.0.0.1:11434/api/chat",
        json={
            "model": data.model,
            "messages": history,
            "stream": False
        }
    )

    result = response.json()

    assistant_reply = (
        result["message"]["content"]
    )

    history.append(
        {
            "role": "assistant",
            "content": assistant_reply
        }
    )

    SESSIONS[data.session_id] = history

    return {
        "success": True,
        "response": assistant_reply
    }
    
@app.get("/chat/session/{session_id}")
def get_session(session_id: str):

    return {
        "messages":
        SESSIONS.get(
            session_id,
            []
        )
    }