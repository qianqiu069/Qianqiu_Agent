from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = DATA_DIR / "chroma_db"
UPLOAD_DIR = DATA_DIR / "uploads"
KB_MANIFEST = DATA_DIR / "kb_manifest.json"


class Settings(BaseSettings):
    agnes_api_key: str = ""
    agnes_base_url: str = "https://apihub.agnes-ai.com/v1"
    agnes_video_query_url: str = "https://apihub.agnes-ai.com/agnesapi"
    chat_model: str = "agnes-2.0-flash"
    image_model: str = "agnes-image-2.1-flash"
    video_model: str = "agnes-video-v2.0"
    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    hf_endpoint: str = ""
    jwt_secret: str = "qianqiu-dev-secret-change-me"

    class Config:
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"


settings = Settings()

import os

if settings.hf_endpoint:
    os.environ.setdefault("HF_ENDPOINT", settings.hf_endpoint)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
