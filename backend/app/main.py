from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import UPLOAD_DIR
from .db import init_db
from .routers import auth, chat, conversations, image, knowledge, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # 预加载 embedding 模型，避免首个 RAG 请求超时
    from .services.rag import get_vectorstore

    get_vectorstore()
    yield


app = FastAPI(title="千秋Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(UPLOAD_DIR)), name="static")

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(image.router)
app.include_router(video.router)
app.include_router(knowledge.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
