from typing import Any, Optional

import httpx

from ..config import settings

_TERMINAL_SUCCESS = {"succeeded", "success", "completed", "complete", "done", "finished"}
_TERMINAL_FAILED = {"failed", "failure", "error", "cancelled", "canceled"}


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.agnes_api_key}",
        "Content-Type": "application/json",
    }


def _dig(data: Any, *paths: str) -> Optional[Any]:
    """按 'a.b' 路径依次尝试取值，返回第一个非空结果。"""
    for path in paths:
        cur = data
        ok = True
        for key in path.split("."):
            if isinstance(cur, dict) and key in cur:
                cur = cur[key]
            elif isinstance(cur, list) and key.isdigit() and int(key) < len(cur):
                cur = cur[int(key)]
            else:
                ok = False
                break
        if ok and cur not in (None, ""):
            return cur
    return None


async def generate_image(prompt: str, size: str, n: int) -> dict:
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(
            f"{settings.agnes_base_url}/images/generations",
            headers=_headers(),
            json={
                "model": settings.image_model,
                "prompt": prompt,
                "size": size,
                "n": n,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    images = []
    for item in data.get("data", []) or []:
        if item.get("url"):
            images.append({"url": item["url"]})
        elif item.get("b64_json"):
            images.append({"url": f"data:image/png;base64,{item['b64_json']}"})
    if not images:
        raise RuntimeError(f"生图响应无法解析: {data}")
    return {"images": images, "created": data.get("created")}


async def create_video_task(payload: dict) -> dict:
    body = {"model": settings.video_model, **payload}
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{settings.agnes_base_url}/videos", headers=_headers(), json=body
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Agnes 返回 {resp.status_code}: {resp.text[:500]}")
        data = resp.json()

    video_id = _dig(data, "video_id", "id", "data.video_id", "data.id", "task_id", "data.task_id")
    if not video_id:
        raise RuntimeError(f"创建视频任务成功但无法解析 video_id: {data}")
    return {"video_id": str(video_id), "raw": data}


def _find_video_url(data: Any) -> Optional[str]:
    candidate = _dig(
        data,
        "video_url",
        "url",
        "data.video_url",
        "data.url",
        "data.0.url",
        "data.0.video_url",
        "output.video_url",
        "output.url",
        "result.video_url",
        "result.url",
    )
    if isinstance(candidate, str) and candidate.startswith("http"):
        return candidate
    return None


async def query_video_task(video_id: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            settings.agnes_video_query_url,
            headers={"Authorization": f"Bearer {settings.agnes_api_key}"},
            params={"video_id": video_id},
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Agnes 返回 {resp.status_code}: {resp.text[:500]}")
        data = resp.json()

    raw_status = _dig(data, "status", "state", "task_status", "data.status", "data.state")
    raw_status = str(raw_status).lower() if raw_status else ""
    video_url = _find_video_url(data)

    if video_url or raw_status in _TERMINAL_SUCCESS:
        status = "succeeded"
    elif raw_status in _TERMINAL_FAILED:
        status = "failed"
    elif raw_status in ("pending", "queued", "waiting"):
        status = "pending"
    else:
        status = "processing"

    return {"status": status, "video_url": video_url, "raw": data}
