from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import os, requests, tempfile
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
import google.generativeai as genai
from dotenv import load_dotenv
import shutil
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

# Embedding mặc định
embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI()

# Cho phép gọi từ extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chia nhỏ text
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100,
    length_function=len
)

def build_chroma_from_text(text, db_path="D:/Nam5ki1/NNTN/Project/chroma_db"):
    # Nếu có DB cũ thì clear collection thay vì xóa folder
    if os.path.exists(db_path):
        try:
            vectordb = Chroma(persist_directory=db_path, embedding_function=embedding)
            vectordb.delete_collection()  # xoá dữ liệu cũ trong DB
        except Exception as e:
            print("⚠️ Không clear được collection:", e)
            shutil.rmtree(db_path, ignore_errors=True)

    # Chia nhỏ văn bản
    chunks = text_splitter.split_text(text)
    documents = [Document(page_content=ch, metadata={"chunk_id": i}) for i, ch in enumerate(chunks)]

    # Tạo Chroma mới
    vectordb = Chroma.from_documents(
        documents=documents,
        embedding=embedding,
        persist_directory=db_path
    )
    vectordb.persist()
    return vectordb

# ---- API ----

# 1. Upload file PDF
@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    reader = PdfReader(tmp_path)
    text = "\n".join([page.extract_text() or "" for page in reader.pages])

    build_chroma_from_text(text, "D:/Nam5ki1/NNTN/Project/chroma_db")
    return {"status": "ok", "message": "Đã tạo ChromaDB từ PDF"}

# 2. Dán link PDF
@app.post("/load_pdf_url")
async def load_pdf_url(url: str = Form(...)):
    r = requests.get(url)
    tmp_path = tempfile.mktemp(suffix=".pdf")
    with open(tmp_path, "wb") as f:
        f.write(r.content)

    reader = PdfReader(tmp_path)
    text = "\n".join([page.extract_text() or "" for page in reader.pages])

    build_chroma_from_text(text, "D:/Nam5ki1/NNTN/Project/chroma_db")
    return {"status": "ok", "message": "Đã tạo ChromaDB từ URL"}

# 3. Paste văn bản
@app.post("/paste_text")
async def paste_text(text: str = Form(...)):
    build_chroma_from_text(text, "D:/Nam5ki1/NNTN/Project/chroma_db")
    return {"status": "ok", "message": "Đã tạo ChromaDB từ văn bản"}

# 4. Ask Question
@app.post("/ask")
async def ask_question(query: str = Form(...)):
    vectordb = Chroma(persist_directory="D:/Nam5ki1/NNTN/Project/chroma_db", embedding_function=embedding)
    docs = vectordb.similarity_search(query, k=3)

    context = "\n\n".join([f"{d.page_content} (chunk {d.metadata['chunk_id']})" for d in docs])

    prompt = f"""
    Bạn là trợ lý nghiên cứu.
    Dựa vào ngữ cảnh sau, hãy trả lời ngắn gọn bằng tiếng Việt và ghi rõ chunk.

    Ngữ cảnh:
    {context}

    Câu hỏi:
    {query}
    """

    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)

    return {
        "answer": response.text,
        "chunks": [d.metadata for d in docs]
    }
