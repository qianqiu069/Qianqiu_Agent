from typing import Literal, Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    use_rag: bool = False


class ImageRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
    n: int = 1


class VideoCreateRequest(BaseModel):
    prompt: str
    image_url: Optional[str] = None
    height: int = 768
    width: int = 1152
    num_frames: int = 441
    frame_rate: int = 24
