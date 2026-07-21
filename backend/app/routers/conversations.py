import json

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_db
from ..services.auth import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def ensure_owner(db, conv_id: int, user_id: int):
    row = db.execute(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user_id)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="会话不存在")


@router.get("")
async def list_conversations(user: dict = Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT id, title, updated_at FROM conversations "
            "WHERE user_id = ? ORDER BY updated_at DESC",
            (user["user_id"],),
        ).fetchall()
    return {"conversations": [dict(r) for r in rows]}


@router.post("")
async def create_conversation(user: dict = Depends(get_current_user)):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO conversations (user_id) VALUES (?)", (user["user_id"],)
        )
    return {"id": cur.lastrowid, "title": "新对话"}


@router.get("/{conv_id}/messages")
async def get_messages(conv_id: int, user: dict = Depends(get_current_user)):
    with get_db() as db:
        ensure_owner(db, conv_id, user["user_id"])
        rows = db.execute(
            "SELECT role, content, reasoning, sources, images FROM messages "
            "WHERE conversation_id = ? ORDER BY id",
            (conv_id,),
        ).fetchall()
    messages = []
    for r in rows:
        messages.append(
            {
                "role": r["role"],
                "content": r["content"],
                "reasoning": r["reasoning"] or None,
                "sources": json.loads(r["sources"]) if r["sources"] else None,
                "images": json.loads(r["images"]) if r["images"] else None,
            }
        )
    return {"messages": messages}


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: int, user: dict = Depends(get_current_user)):
    with get_db() as db:
        ensure_owner(db, conv_id, user["user_id"])
        db.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        db.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    return {"ok": True}
