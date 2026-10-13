"""
model.py – Offline rule-based scam detector (zero dependencies on HuggingFace).

This is a fast, offline stand-in for a fine-tuned transformer model.
It uses weighted keyword matching across English and Hindi scam indicators,
returning a label + confidence score + per-token explanation weights.

Replace `predict_scam` with a real transformer call once a suitable
model/checkpoint is available.
"""

import re
from typing import Tuple, Dict

# ---------------------------------------------------------------------------
# Keyword banks  (extend freely)
# ---------------------------------------------------------------------------

SCAM_KEYWORDS_EN = {
    # Job / money scams
    "urgent hiring": 0.9,
    "work from home": 0.7,
    "earn money fast": 0.95,
    "guaranteed income": 0.9,
    "no experience needed": 0.75,
    "easy money": 0.9,
    "send money": 0.95,
    "wire transfer": 0.85,
    "advance fee": 0.95,
    "processing fee": 0.85,
    "registration fee": 0.8,
    "kyc update": 0.9,
    "account blocked": 0.85,
    "verify your account": 0.8,
    "click here": 0.6,
    "limited time offer": 0.7,
    "lottery winner": 0.95,
    "you have won": 0.95,
    "prize money": 0.9,
    "otp": 0.7,
    "aadhar": 0.5,
    "pan card": 0.5,
    "whatsapp": 0.3,
    "telegram": 0.4,
    "investment opportunity": 0.75,
    "double your money": 0.95,
    "crypto": 0.55,
    "bitcoin": 0.55,
    "part time job": 0.65,
    "data entry": 0.5,
    "freelance": 0.3,
    "refer and earn": 0.6,
    "mlm": 0.85,
    "network marketing": 0.7,
    "100% profit": 0.95,
    "foreign company": 0.7,
    "us visa": 0.6,
    "green card": 0.6,
}

SCAM_KEYWORDS_HI = {
    "पैसे कमाएं": 0.85,
    "घर बैठे": 0.75,
    "लॉटरी": 0.95,
    "इनाम": 0.8,
    "केवाईसी": 0.9,
    "खाता बंद": 0.85,
    "ओटीपी": 0.8,
    "आधार": 0.5,
    "पैन कार्ड": 0.5,
    "निवेश": 0.55,
    "मुनाफा": 0.7,
    "रजिस्ट्रेशन फीस": 0.85,
    "अग्रिम शुल्क": 0.9,
    "नौकरी": 0.3,
    "तुरंत": 0.4,
    "सीमित समय": 0.65,
    "डबल पैसे": 0.95,
    "क्रिप्टो": 0.6,
    "व्हाट्सएप": 0.35,
    "टेलीग्राम": 0.45,
}

KEYWORD_BANKS: Dict[str, Dict[str, float]] = {
    "en": SCAM_KEYWORDS_EN,
    "hi": {**SCAM_KEYWORDS_EN, **SCAM_KEYWORDS_HI},  # Hindi: check both
}

# Confidence threshold above which we classify as "scam"
SCAM_THRESHOLD = 0.45


# ---------------------------------------------------------------------------
# Public API  (mirrors the transformer-based interface)
# ---------------------------------------------------------------------------

def load_model():
    """No-op for the rule-based engine — returns sentinel objects."""
    return None, None  # model=None, tokenizer=None


def predict_scam(
    model,
    tokenizer,
    text: str,
    language: str = "en",
) -> Tuple[str, float]:
    """Classify text as 'scam' or 'legitimate' using weighted keyword scoring.

    Args:
        model: Unused (reserved for future transformer model).
        tokenizer: Unused (reserved for future transformer model).
        text: Input message.
        language: ISO 639-1 code ('en' or 'hi').

    Returns:
        label (str): 'scam' or 'legitimate'.
        confidence (float): Score in [0, 1].
    """
    score, _ = _score_text(text, language)
    label = "scam" if score >= SCAM_THRESHOLD else "legitimate"
    return label, round(score, 4)


def get_token_weights(text: str, language: str = "en") -> Dict[str, float]:
    """Return per-keyword importance weights for explainability.

    Args:
        text: Input message.
        language: ISO 639-1 code.

    Returns:
        dict mapping matched keyword → its weight (0–1).
    """
    _, matched = _score_text(text, language)
    return matched


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _score_text(text: str, language: str) -> Tuple[float, Dict[str, float]]:
    """Compute a scam probability score via keyword matching."""
    bank = KEYWORD_BANKS.get(language, SCAM_KEYWORDS_EN)
    lower = text.lower()

    matched: Dict[str, float] = {}
    total_weight = 0.0

    for keyword, weight in bank.items():
        pattern = re.compile(re.escape(keyword), re.IGNORECASE)
        if pattern.search(lower):
            matched[keyword] = weight
            total_weight += weight

    if not matched:
        return 0.05, {}  # very low baseline score

    # Sigmoid-like squashing so multiple matches push toward 1 but never exceed it
    score = 1.0 - 1.0 / (1.0 + total_weight)
    return min(score, 0.99), matched
