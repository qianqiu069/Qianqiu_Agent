from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..services import ingest
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/kb", tags=["knowledge"], dependencies=[Depends(get_current_user)])


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    try:
        return ingest.ingest_file(file.filename or "unnamed.txt", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文档入库失败: {e}")


@router.get("/docs")
async def docs():
    return {"docs": ingest.list_docs()}


@router.delete("/docs/{doc_id}")
async def delete(doc_id: str):
    if not ingest.delete_doc(doc_id):
        raise HTTPException(status_code=404, detail="文档不存在")
    return {"ok": True}
