from fastapi import FastAPI
from dotenv import load_dotenv
from routes.webhook import router as webhook_router
from routes.chat import router as chat_router

load_dotenv()

app = FastAPI(title="GHL Sales Chatbot")
app.include_router(webhook_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
