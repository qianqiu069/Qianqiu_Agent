import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import tool
from pydantic import BaseModel

from ..db import get_db
from ..services import agnes_client
from ..services.auth import get_current_user
from ..services.llm import get_chat_llm
from ..services.rag import RAG_SYSTEM_PROMPT, retrieve
from .conversations import ensure_owner

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_AGENT_TURNS = 3
HISTORY_LIMIT = 20

BASE_SYSTEM_PROMPT = (
    "你是千秋Agent，一个专业、友好的中文AI助手。"
    "你可以调用工具：当用户想要画图/生成图片时调用 generate_image；"
    "当问题可能涉及用户上传的私有资料时调用 search_knowledge_base。"
    "不需要工具时直接回答。"
)


class AgentChatRequest(BaseModel):
    conversation_id: int
    message: str
    use_rag: bool = False


@tool
async def generate_image(prompt: str) -> str:
    """根据文字描述生成一张图片。参数 prompt 是图片的英文或中文描述，返回图片URL。"""
    result = await agnes_client.generate_image(prompt, "1024x1024", 1)
    return result["images"][0]["url"]


@tool
def search_knowledge_base(query: str) -> str:
    """在用户的私有知识库中检索与 query 相关的资料，返回资料原文片段。"""
    context, sources = retrieve(query)
    if not context:
        return "知识库中没有找到相关资料。"
    return context


TOOLS = {"generate_image": generate_image, "search_knowledge_base": search_knowledge_base}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _load_history(conv_id: int) -> list:
    with get_db() as db:
        rows = db.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? "
            "ORDER BY id DESC LIMIT ?",
            (conv_id, HISTORY_LIMIT),
        ).fetchall()
    history = []
    for r in reversed(rows):
        cls = HumanMessage if r["role"] == "user" else AIMessage
        history.append(cls(content=r["content"]))
    return history


def _save_message(conv_id: int, role: str, content: str, reasoning=None, sources=None, images=None):
    with get_db() as db:
        db.execute(
            "INSERT INTO messages (conversation_id, role, content, reasoning, sources, images) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                conv_id,
                role,
                content,
                reasoning or None,
                json.dumps(sources, ensure_ascii=False) if sources else None,
                json.dumps(images, ensure_ascii=False) if images else None,
            ),
        )
        db.execute(
            "UPDATE conversations SET updated_at = datetime('now', 'localtime') WHERE id = ?",
            (conv_id,),
        )


def _maybe_set_title(conv_id: int, first_message: str):
    with get_db() as db:
        row = db.execute(
            "SELECT title FROM conversations WHERE id = ?", (conv_id,)
        ).fetchone()
        if row and row["title"] == "新对话":
            title = first_message.strip().replace("\n", " ")[:20]
            db.execute(
                "UPDATE conversations SET title = ? WHERE id = ?", (title or "新对话", conv_id)
            )


@router.post("/stream")
async def chat_stream(req: AgentChatRequest, user: dict = Depends(get_current_user)):
    with get_db() as db:
        ensure_owner(db, req.conversation_id, user["user_id"])

    history = _load_history(req.conversation_id)
    _save_message(req.conversation_id, "user", req.message)
    _maybe_set_title(req.conversation_id, req.message)

    messages: list = [SystemMessage(content=BASE_SYSTEM_PROMPT)]
    sources: list[str] = []

    if req.use_rag:
        context, sources = retrieve(req.message)
        if context:
            messages.append(SystemMessage(content=RAG_SYSTEM_PROMPT.format(context=context)))

    messages.extend(history)
    messages.append(HumanMessage(content=req.message))

    llm = get_chat_llm().bind_tools(list(TOOLS.values()))

    async def gen():
        nonlocal sources
        full_content = ""
        full_reasoning = ""
        images: list[str] = []

        if sources:
            yield _sse({"type": "sources", "sources": sources})

        try:
            for _ in range(MAX_AGENT_TURNS):
                acc = None
                async for chunk in llm.astream(messages):
                    rc = chunk.additional_kwargs.get("reasoning_content")
                    if rc:
                        full_reasoning += rc
                        yield _sse({"type": "reasoning", "delta": rc})
                    if chunk.content:
                        full_content += chunk.content
                        yield _sse({"delta": chunk.content})
                    acc = chunk if acc is None else acc + chunk

                tool_calls = acc.tool_calls if acc else []
                if not tool_calls:
                    break

                messages.append(
                    AIMessage(content=acc.content or "", tool_calls=tool_calls)
                )
                for tc in tool_calls:
                    name, args, tc_id = tc["name"], tc["args"], tc["id"]
                    yield _sse({"type": "tool_call", "name": name, "args": args})
                    try:
                        result = await TOOLS[name].ainvoke(args)
                    except Exception as e:
                        result = f"工具执行失败: {e}"
                    if name == "generate_image" and str(result).startswith("http"):
                        images.append(str(result))
                    if name == "search_knowledge_base" and "没有找到" not in str(result):
                        _, kb_sources = retrieve(args.get("query", ""))
                        sources = list(dict.fromkeys(sources + kb_sources))
                        yield _sse({"type": "sources", "sources": sources})
                    yield _sse({"type": "tool_result", "name": name, "result": str(result)[:500]})
                    messages.append(ToolMessage(content=str(result), tool_call_id=tc_id))
        except Exception as e:
            yield _sse({"type": "error", "message": str(e)})

        _save_message(
            req.conversation_id,
            "assistant",
            full_content,
            reasoning=full_reasoning,
            sources=sources,
            images=images,
        )
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
