from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Literal, Dict, List, Optional

from model import load_model, predict_scam, get_token_weights, get_full_analysis

app = FastAPI(title="Social Scam Detector API", version="3.0.0")

# Allow Vite dev-server (5173 / 5174) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
model, tokenizer = load_model()


class DetectRequest(BaseModel):
    text: str
    lang: Literal["en", "hi", "hinglish", "auto"] = "auto"


class MetaInfo(BaseModel):
    urls: List[str]
    phones: List[str]
    upi_ids: List[str] = []
    suspicious_urls: List[str]
    has_urgency: bool
    has_money: bool
    has_otp: bool
    has_guarantee: bool = False
    has_threat: bool = False


class StructuralInfo(BaseModel):
    caps_ratio: float = 0.0
    exclamation_density: float = 0.0
    question_density: float = 0.0
    digit_ratio: float = 0.0
    word_count: int = 0
    has_large_money: float = 0.0
    money_magnitude: float = 0.0
    url_count: float = 0.0
    phone_count: float = 0.0
    upi_count: float = 0.0


class DetectResponse(BaseModel):
    label: str
    confidence: float
    explanation: Dict[str, float]       # keyword → importance weight
    categories: List[str]               # scam category labels
    detected_language: str
    meta: Optional[MetaInfo] = None
    structural: Optional[StructuralInfo] = None
    threat_signals: List[str] = []


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return {"status": "ok", "engine": "hybrid-nlp-v3", "version": "3.0.0"}


@app.post("/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    label, confidence = predict_scam(model, tokenizer, req.text, req.lang)
    explanation = get_token_weights(req.text, req.lang)
    analysis = get_full_analysis(req.text, req.lang)

    return DetectResponse(
        label=label,
        confidence=confidence,
        explanation=explanation,
        categories=analysis["categories"],
        detected_language=analysis["detected_language"],
        meta=MetaInfo(**analysis["meta"]),
        structural=StructuralInfo(**analysis.get("structural", {})),
        threat_signals=analysis.get("threat_signals", []),
    )
