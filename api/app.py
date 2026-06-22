# api/app.py

from fastapi import FastAPI
import shutil
from api.schemas import ModelRequest, PullModelRequest
import subprocess
import psutil
import platform
from pydantic import BaseModel
from typing import List
import uuid
import requests
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import time 
from api.database import (
    init_db,
    create_session as db_create_session,
    save_message,
    load_messages,
    get_session,
    list_sessions as db_list_sessions,
    update_session_model,
    rename_session as db_rename_session,
    session_exists,
    delete_session as db_delete_session
)

OLLAMA_EXE = r"D:/Ollama/ollama.exe"
OLLAMA_URL = "http://127.0.0.1:11434"

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
    
class StreamChatRequest(BaseModel):
    model: str
    message: str

class RenameSessionRequest(BaseModel):
    session_id: str
    title: str

app = FastAPI(
    title="Local LLMx API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

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
    try:
        response = requests.get(
            f"{OLLAMA_URL}/api/tags",
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        return {
            "models": data.get("models", []),
            "ollama_running": True
        }
    except Exception as exc:
        return {
            "models": [],
            "ollama_running": False,
            "error": str(exc)
        }

@app.get("/models/running")
def running_models():
    try:
        response = requests.get(
            f"{OLLAMA_URL}/api/ps",
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        return {
            "count": 0,
            "models": [],
            "ollama_running": False,
            "error": str(exc)
        }

    return {
        "count": len(data.get("models", []))
        if isinstance(data.get("models"), list)
        else 0,
        "models": data.get("models", []),
        "ollama_running": True
    }
    
@app.post("/models/unload")
def unload_model(request: ModelRequest):
    payload = {
        "model": request.model,
        "prompt": "",
        "stream": False,
        "keep_alive": 0
    }

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=60
        )
        response.raise_for_status()
    except Exception as exc:
        return {
            "success": False,
            "model": request.model,
            "error": str(exc)
        }

    return {
        "success": True,
        "model": request.model
    }

@app.post("/models/load")
def load_model(request: ModelRequest):

    payload = {
        "model": request.model,
        "prompt": "hi",
        "stream": False,
        "options": {
            "num_predict": 1
        },
        "keep_alive": "5m"
    }

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=120
        )
        response.raise_for_status()
    except Exception as exc:
        return {
            "success": False,
            "model": request.model,
            "error": str(exc)
        }

    return {
        "success": True,
        "model": request.model
    }

@app.get("/models/{model_name}")
def inspect_model(model_name: str):

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/show",
            json={"model": model_name},
            timeout=30
        )
        response.raise_for_status()
        return {
            "success": True,
            "model": model_name,
            "details": response.json()
        }
    except Exception as exc:
        return {
            "success": False,
            "model": model_name,
            "error": str(exc)
        }

@app.delete("/models/{model_name}")
def delete_model(model_name: str):

    try:
        response = requests.delete(
            f"{OLLAMA_URL}/api/delete",
            json={"model": model_name},
            timeout=120
        )
        response.raise_for_status()
        return {
            "success": True,
            "model": model_name
        }
    except Exception as exc:
        return {
            "success": False,
            "model": model_name,
            "error": str(exc)
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
def create_chat_session():

    session_id = uuid.uuid4().hex

    db_create_session(
        session_id,
        "unknown",
        "New Chat"
    )

    return {
        "success": True,
        "session_id": session_id
    }
    
@app.get("/chat/sessions")
def list_sessions():

    sessions = []

    for session in db_list_sessions():

        messages = load_messages(
            session["id"]
        )

        sessions.append({
            "session_id": session["id"],
            "title": session["title"],
            "model": session["model"],
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "message_count": len(messages)
        })

    return {
        "count": len(sessions),
        "sessions": sessions
    }
    
@app.post("/chat/session/message")
def session_message(data: SessionMessage):

    session = get_session(
        data.session_id
    )

    if not session:

        return {
            "success": False,
            "error": "Session not found"
        }

    save_message(
        data.session_id,
        "user",
        data.message
    )

    if session["title"] == "New Chat":
        db_rename_session(
            data.session_id,
            data.message[:50]
        )

    update_session_model(
        data.session_id,
        data.model
    )

    history = load_messages(
        data.session_id
    )

    response = requests.post(
        "http://127.0.0.1:11434/api/chat",
        json={
            "model": data.model,
            "messages": history,
            "stream": False
        },
        timeout=600
    )

    result = response.json()

    assistant_reply = result["message"]["content"]

    save_message(
        data.session_id,
        "assistant",
        assistant_reply
    )

    history = load_messages(
        data.session_id
    )

    session = get_session(
        data.session_id
    )

    return {
        "success": True,
        "session_id": data.session_id,
        "title": session["title"],
        "message_count": len(history),
        "response": assistant_reply
    }
    
@app.get("/chat/session/{session_id}")
def get_chat_session(session_id: str):

    return {
        "messages": load_messages(session_id)
    }
    
@app.post("/chat/stream")
def chat_stream(data: StreamChatRequest):

    def generate():

        response = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": data.model,
                "prompt": data.message,
                "stream": True
            },
            stream=True
        )

        for line in response.iter_lines():

            if not line:
                continue

            chunk = json.loads(
                line.decode("utf-8")
            )

            token = chunk.get(
                "response",
                ""
            )

            if token:
                yield f"data: {token}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
    
@app.delete("/chat/session/{session_id}")
def delete_chat_session(session_id: str):

    db_delete_session(session_id)

    return {
        "success": True
    }
    
@app.post("/chat/session/rename")
def rename_chat_session(data: RenameSessionRequest):

    session = get_session(
        data.session_id
    )

    if not session:
        return {
            "success": False
        }

    db_rename_session(
        data.session_id,
        data.title
    )

    return {
        "success": True
    }
