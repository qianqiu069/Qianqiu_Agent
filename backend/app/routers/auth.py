import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import get_db
from ..services.auth import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthRequest(BaseModel):
    username: str = Field(min_length=2, max_length=32)
    password: str = Field(min_length=6, max_length=64)


@router.post("/register")
async def register(req: AuthRequest):
    with get_db() as db:
        try:
            cur = db.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (req.username, hash_password(req.password)),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="用户名已存在")
        user_id = cur.lastrowid
    return {"token": create_token(user_id, req.username), "username": req.username}


@router.post("/login")
async def login(req: AuthRequest):
    with get_db() as db:
        row = db.execute(
            "SELECT id, password_hash FROM users WHERE username = ?", (req.username,)
        ).fetchone()
    if row is None or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"token": create_token(row["id"], req.username), "username": req.username}
