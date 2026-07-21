import json
import uuid
from datetime import datetime
from pathlib import Path

from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import KB_MANIFEST, UPLOAD_DIR
from .rag import get_vectorstore

ALLOWED_EXTS = {".txt", ".md", ".pdf", ".docx"}

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""],
)


def _load_manifest() -> list[dict]:
    if KB_MANIFEST.exists():
        return json.loads(KB_MANIFEST.read_text(encoding="utf-8"))
    return []


def _save_manifest(items: list[dict]) -> None:
    KB_MANIFEST.write_text(
        json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _load_documents(path: Path):
    ext = path.suffix.lower()
    if ext in (".txt", ".md"):
        try:
            return TextLoader(str(path), encoding="utf-8").load()
        except UnicodeDecodeError:
            return TextLoader(str(path), encoding="gbk").load()
    if ext == ".pdf":
        return PyPDFLoader(str(path)).load()
    if ext == ".docx":
        return Docx2txtLoader(str(path)).load()
    raise ValueError(f"不支持的文件类型: {ext}")


def ingest_file(filename: str, content: bytes) -> dict:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise ValueError(f"不支持的文件类型: {ext}，仅支持 txt/md/pdf/docx")

    doc_id = uuid.uuid4().hex
    saved_path = UPLOAD_DIR / f"{doc_id}{ext}"
    saved_path.write_bytes(content)

    docs = _load_documents(saved_path)
    chunks = _splitter.split_documents(docs)
    if not chunks:
        saved_path.unlink(missing_ok=True)
        raise ValueError("文档内容为空，无法入库")

    for c in chunks:
        c.metadata.update({"doc_id": doc_id, "filename": filename})

    get_vectorstore().add_documents(chunks)

    record = {
        "doc_id": doc_id,
        "filename": filename,
        "chunks": len(chunks),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    manifest = _load_manifest()
    manifest.append(record)
    _save_manifest(manifest)
    return record


def list_docs() -> list[dict]:
    return _load_manifest()


def delete_doc(doc_id: str) -> bool:
    manifest = _load_manifest()
    remaining = [m for m in manifest if m["doc_id"] != doc_id]
    if len(remaining) == len(manifest):
        return False

    vs = get_vectorstore()
    ids = vs.get(where={"doc_id": doc_id}).get("ids", [])
    if ids:
        vs.delete(ids=ids)

    for f in UPLOAD_DIR.glob(f"{doc_id}.*"):
        f.unlink(missing_ok=True)

    _save_manifest(remaining)
    return True
