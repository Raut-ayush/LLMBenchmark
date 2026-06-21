from pydantic import BaseModel

class PullModelRequest(BaseModel):
    model: str

class ModelRequest(BaseModel):
    model: str