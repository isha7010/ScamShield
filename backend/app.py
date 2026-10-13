from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Literal, Dict

from model import load_model, predict_scam, get_token_weights

app = FastAPI(title="Social Scam Detector API", version="1.0.0")

# Allow Vite dev-server (5173 / 5174) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup (no-op for rule-based engine)
model, tokenizer = load_model()


class DetectRequest(BaseModel):
    text: str
    lang: Literal["en", "hi"] = "en"


class DetectResponse(BaseModel):
    label: str
    confidence: float
    explanation: Dict[str, float]  # keyword → importance weight


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok", "engine": "rule-based"}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    label, confidence = predict_scam(model, tokenizer, req.text, req.lang)
    explanation = get_token_weights(req.text, req.lang)

    return DetectResponse(label=label, confidence=confidence, explanation=explanation)
