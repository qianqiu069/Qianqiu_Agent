from langchain_deepseek import ChatDeepSeek

from ..config import settings


def get_chat_llm(streaming: bool = True) -> ChatDeepSeek:
    # ChatDeepSeek 能透传 Agnes 返回的 reasoning_content（ChatOpenAI 会丢弃）
    return ChatDeepSeek(
        model=settings.chat_model,
        api_base=settings.agnes_base_url,
        api_key=settings.agnes_api_key,
        streaming=streaming,
        temperature=0.7,
    )
