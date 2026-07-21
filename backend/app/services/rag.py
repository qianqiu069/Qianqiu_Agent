from functools import lru_cache

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from ..config import CHROMA_DIR, settings

RAG_SYSTEM_PROMPT = (
    "你是千秋Agent，一个专业、友好的中文AI助手。"
    "请优先根据下面提供的参考资料回答用户问题；"
    "如果参考资料与问题无关，可以结合自身知识回答，但不要编造资料中不存在的内容。\n\n"
    "参考资料：\n{context}"
)


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name=settings.embedding_model,
        encode_kwargs={"normalize_embeddings": True},
    )


@lru_cache(maxsize=1)
def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name="qianqiu_kb",
        embedding_function=get_embeddings(),
        persist_directory=str(CHROMA_DIR),
    )


def retrieve(query: str, k: int = 4):
    docs = get_vectorstore().similarity_search(query, k=k)
    context = "\n\n".join(
        f"【{d.metadata.get('filename', '未知文档')}】{d.page_content}" for d in docs
    )
    sources = []
    seen = set()
    for d in docs:
        name = d.metadata.get("filename", "未知文档")
        if name not in seen:
            seen.add(name)
            sources.append(name)
    return context, sources
