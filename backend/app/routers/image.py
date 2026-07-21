from fastapi import APIRouter, Depends, HTTPException

from ..schemas import ImageRequest
from ..services import agnes_client
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/image", tags=["image"])


@router.post("/generate")
async def generate(req: ImageRequest, user: dict = Depends(get_current_user)):
    try:
        return await agnes_client.generate_image(req.prompt, req.size, req.n)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"生图失败: {e}")
