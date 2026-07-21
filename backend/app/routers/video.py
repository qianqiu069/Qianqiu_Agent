import base64
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import UPLOAD_DIR
from ..db import get_db
from ..schemas import VideoCreateRequest
from ..services import agnes_client
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/video", tags=["video"])


@router.post("/create")
async def create(req: VideoCreateRequest, user: dict = Depends(get_current_user)):
    payload: dict = {
        "prompt": req.prompt,
        "num_frames": req.num_frames,
        "frame_rate": req.frame_rate,
    }
    mode = "t2v"
    if req.image_url:
        payload["image"] = req.image_url
        mode = "i2v"
    else:
        payload["height"] = req.height
        payload["width"] = req.width
    try:
        result = await agnes_client.create_video_task(payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"创建视频任务失败: {e}")

    with get_db() as db:
        db.execute(
            "INSERT INTO video_tasks (user_id, video_id, prompt, mode) VALUES (?, ?, ?, ?)",
            (user["user_id"], result["video_id"], req.prompt, mode),
        )
    return {"video_id": result["video_id"]}


@router.get("/tasks")
async def tasks(user: dict = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT video_id, prompt, mode, status, video_url, created_at "
            "FROM video_tasks WHERE user_id = ? ORDER BY id DESC",
            (user["user_id"],),
        ).fetchall()
    return {"tasks": [dict(r) for r in rows]}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...), user: dict = Depends(get_current_user)
):
    ext = Path(file.filename or "img.png").suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(status_code=400, detail="仅支持 png/jpg/jpeg/webp 图片")
    content = await file.read()
    name = f"img_{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(content)
    mime = "image/jpeg" if ext in (".jpg", ".jpeg") else f"image/{ext.lstrip('.')}"
    data_url = f"data:{mime};base64,{base64.b64encode(content).decode()}"
    return {"image_url": f"/static/{name}", "data_url": data_url}


@router.get("/status/{video_id}")
async def status(video_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await agnes_client.query_video_task(video_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"查询视频状态失败: {e}")

    with get_db() as db:
        db.execute(
            "UPDATE video_tasks SET status = ?, video_url = ? "
            "WHERE video_id = ? AND user_id = ?",
            (result["status"], result["video_url"], video_id, user["user_id"]),
        )
    return result
