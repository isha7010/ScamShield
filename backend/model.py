"""
model.py — Hybrid scam detection engine v3.0

Layer 1: TF-IDF + Logistic Regression (expanded bilingual corpus)
Layer 2: Structural & statistical feature overlay
Layer 3: Weighted keyword scoring for explainability
Layer 4: URL, phone, UPI & metadata pattern analysis
Auto language detection with Hinglish (transliteration) support.
"""

import re
import pickle
import os
import math
from typing import Tuple, Dict, List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# Training data  (English + Hindi + Hinglish — expanded corpus)
# ---------------------------------------------------------------------------

TRAIN_DATA = [
    # ── SCAM samples (label=1) ────────────────────────────────────

    # Job scams
    ("Urgent hiring! Work from home, earn money fast. No experience needed. Send OTP now!", 1),
    ("Earn Rs 5000 daily from home. Part time job. WhatsApp us now. No investment needed.", 1),
    ("Data entry job from home. Earn Rs 800 per hour. No experience. Telegram us now.", 1),
    ("Amazon work from home job. Package opening job. Earn Rs 3000 daily. Apply now!", 1),
    ("Part time job available. Earn 50000 monthly. WhatsApp now. Immediate joining.", 1),
    ("Online typing job from home daily payment. No target no investment. Contact telegram.", 1),
    ("Copy paste work from home. Earn Rs 15000 weekly. No interview. Direct joining.", 1),
    ("International company hiring freshers. Work 2 hours daily earn 25000 monthly. WhatsApp now.", 1),
    ("Flipkart hiring delivery boys. Salary Rs 45000. No interview needed. Click link to apply.", 1),

    # KYC / Banking fraud
    ("Dear customer, your KYC is expired. Update immediately or your account will be blocked. Click here.", 1),
    ("URGENT: Your SBI account is blocked. Verify OTP immediately to restore access.", 1),
    ("Your PAN card has been suspended. Pay fine of Rs 5000 to avoid legal action.", 1),
    ("Your bank account will be frozen in 24 hours. Update KYC now: http://bit.ly/kyc-update.", 1),
    ("RBI alert: Your UPI ID is linked to suspicious activity. Verify at http://tiny.cc/rbi-check.", 1),
    ("Your Axis Bank credit card is blocked due to unusual activity. Call 9876543210 immediately.", 1),
    ("HDFC Bank: Your account is compromised. Share OTP to verify your identity and restore access.", 1),

    # Lottery / Prize scams
    ("Congratulations! You have won a lottery prize of Rs 50000. Send registration fee to claim.", 1),
    ("Free iPhone 15 winner! You have been selected. Pay Rs 500 delivery charge only.", 1),
    ("Send Rs 100 to activate your reward. You won Rs 25000 in lucky draw!", 1),
    ("You are the lucky winner of Rs 1 crore! Pay processing fee of Rs 2000 to claim prize.", 1),
    ("Google Annual Lucky Draw winner! You won $500,000. Send passport copy and bank details.", 1),
    ("WhatsApp lottery winner! You have been selected for Rs 2 lakh. Forward to 10 people.", 1),

    # Investment fraud
    ("Get rich quick with our crypto investment scheme. 100% profit guaranteed. Limited slots!", 1),
    ("Double your money in 7 days! Join our MLM network marketing scheme today.", 1),
    ("Investment opportunity: 300% returns in 30 days. Only serious investors contact.", 1),
    ("Bitcoin investment club. Minimum Rs 500. Get Rs 5000 in 24 hours guaranteed.", 1),
    ("Invest in forex trading. Daily returns 5%. Zero risk guaranteed. Join our VIP group.", 1),
    ("New crypto token launching. Invest Rs 1000 today, get Rs 1 lakh in 1 month.", 1),
    ("Stock market tips with 100% accuracy. Join premium WhatsApp group. Rs 999 only.", 1),

    # Advance fee scams
    ("You are selected for a job in USA. Send advance fee of Rs 2000 for visa processing.", 1),
    ("Refer and earn Rs 1000 per referral. Join now! Limited time offer.", 1),
    ("Naukri.com: You have been shortlisted. Pay Rs 1000 security deposit to confirm.", 1),
    ("Free laptop offer for students. Fill this form and pay Rs 200 courier charge.", 1),
    ("Government scheme: Get Rs 5 lakh loan at 0% interest. Pay Rs 500 registration fee.", 1),
    ("You won a scholarship of Rs 50000. Pay Rs 300 processing fee to claim.", 1),

    # Social engineering / Impersonation
    ("Your Aadhaar card linked to fraud activity. Call this number immediately to avoid arrest.", 1),
    ("TRAI will disconnect your number in 2 hours. Press 1 to speak to officer.", 1),
    ("CBI investigation against your name. Transfer Rs 10000 to avoid arrest. Call immediately.", 1),
    ("Income Tax Department: Tax evasion detected. Pay penalty online or face prosecution.", 1),
    ("Customs department: Illegal parcel in your name intercepted. Call to resolve or face arrest.", 1),

    # Phishing
    ("Your Netflix account is suspended. Click here to update payment: http://bit.ly/netflix-pay.", 1),
    ("Amazon: Your order cannot be delivered. Verify address at http://amaz0n-verify.com.", 1),
    ("Instagram account recovery: Click http://insta-recover.tk to restore your account.", 1),

    # Hindi scam samples
    ("घर बैठे पैसे कमाएं! रोज ₹2000 की कमाई। अभी रजिस्ट्रेशन करें और ओटीपी भेजें।", 1),
    ("बधाई हो! आपने लॉटरी जीती है। ₹50,000 पाने के लिए रजिस्ट्रेशन फीस भेजें।", 1),
    ("केवाईसी अपडेट करें वरना आपका खाता बंद हो जाएगा। तुरंत क्लिक करें।", 1),
    ("क्रिप्टो में निवेश करें, 100% मुनाफा। सीमित समय का ऑफर!", 1),
    ("आपका आधार कार्ड संदिग्ध गतिविधि से जुड़ा है। गिरफ्तारी से बचने के लिए तुरंत कॉल करें।", 1),
    ("सरकारी योजना: ₹5 लाख का लोन बिना ब्याज। ₹500 रजिस्ट्रेशन फीस भेजें।", 1),
    ("आपका बैंक खाता 24 घंटे में बंद हो जाएगा। अभी KYC अपडेट करें।", 1),
    ("बिटकॉइन में निवेश करें। 24 घंटे में पैसे डबल। गारंटीड रिटर्न।", 1),

    # Hinglish scam samples (transliterated)
    ("Ghar baithe paise kamao! Roz 2000 ki kamai. Abhi register karo aur OTP bhejo.", 1),
    ("Aapne lottery jeeti hai! 50000 paane ke liye registration fee bhejo.", 1),
    ("KYC update karo warna account band ho jayega. Turant click karo.", 1),
    ("Crypto mein invest karo, 100% munafa. Limited time offer!", 1),
    ("Paytm se UPI payment karo aur instant cashback pao. Rs 500 bhejo.", 1),
    ("Online job karo ghar baithe. Daily 5000 kamao. WhatsApp karo abhi.", 1),

    # ── LEGITIMATE samples (label=0) ──────────────────────────────

    # Professional communication
    ("Dear candidate, your interview is scheduled for Monday 10am. Please bring resume and ID.", 0),
    ("Meeting reminder: Team standup at 3pm today. Join via Google Meet link.", 0),
    ("Please submit your assignment before Friday 5pm. Late submissions not accepted.", 0),
    ("Internship offer letter attached. Please sign and return by Thursday.", 0),
    ("Project deadline is next Friday. Please update your task status on Jira.", 0),
    ("Your performance review is scheduled for next Tuesday at 2pm in Conference Room B.", 0),
    ("Welcome aboard! Your employee ID is EMP1234. Please complete onboarding by Friday.", 0),
    ("Quarterly team outing planned for Saturday. RSVP by Wednesday.", 0),

    # Order / Delivery
    ("Your order has been shipped. Expected delivery in 3-5 business days. Track here.", 0),
    ("Your cab is arriving in 3 minutes. Driver: Ramesh, MH12AB1234.", 0),
    ("Your Zomato order is being prepared. Estimated delivery in 30 minutes.", 0),
    ("Your Amazon package was delivered today. Rate your experience.", 0),

    # Banking / Financial (legitimate)
    ("Your salary has been credited to your account. Check your bank statement.", 0),
    ("Your electricity bill of Rs 1200 is due on 15th. Pay online or at any center.", 0),
    ("Your SIP of Rs 5000 has been successfully invested for October 2024.", 0),
    ("Your EMI of Rs 8500 has been auto-debited. Next EMI due on 5th November.", 0),
    ("Transaction alert: Rs 2500 debited from your account at Reliance Fresh.", 0),

    # OTP / Authentication (legitimate)
    ("Your OTP for login is 847291. Valid for 10 minutes. Do not share with anyone.", 0),
    ("Your verification code is 592034. Use this to complete your registration.", 0),
    ("2FA code: 183927. This code expires in 5 minutes.", 0),

    # Education
    ("Campus placement drive on 20th October. Register by 18th October.", 0),
    ("Semester exam timetable has been released. Check the college portal.", 0),
    ("Your library book is due for return on 25th October. Renew online if needed.", 0),
    ("Congratulations on your admission! Orientation is on November 1st at 9am.", 0),

    # Health / Community
    ("Reminder: Your prescription is ready for pickup at the pharmacy.", 0),
    ("Blood donation camp on Sunday. Walk-in accepted. All blood groups needed.", 0),
    ("Your dental appointment is confirmed for Thursday 4pm with Dr. Sharma.", 0),
    ("COVID-19 booster dose available at your nearest health center. Book online.", 0),

    # Travel
    ("Your flight PNR is XY1234. Check-in opens 24 hours before departure.", 0),
    ("Your train ticket PNR WL/14. Current status: Confirmed. Coach S4, Berth 27.", 0),
    ("Booking confirmed: Hotel Taj, Mumbai. Check-in: Nov 5, Check-out: Nov 7.", 0),

    # Subscriptions
    ("Your subscription renews on Nov 1. Manage your plan in account settings.", 0),
    ("Your Spotify Premium trial ends in 3 days. Upgrade to continue ad-free music.", 0),
    ("Your JioFiber plan of Rs 999 has been renewed. Valid until December 15.", 0),

    # Hindi legitimate
    ("आपका इंटरव्यू सोमवार को सुबह 10 बजे है। कृपया अपना बायोडेटा लाएं।", 0),
    ("आपका ऑर्डर डिलीवर हो गया। किसी समस्या के लिए हमसे संपर्क करें।", 0),
    ("आपकी सैलरी आपके खाते में जमा हो गई है। कृपया बैलेंस चेक करें।", 0),
    ("आपकी ट्रेन का PNR कन्फर्म हो गया है। कोच S4, सीट 27।", 0),
    ("कल सुबह 9 बजे टीम मीटिंग है। कृपया समय पर आएं।", 0),

    # Hinglish legitimate
    ("Aapka interview Monday ko 10 baje hai. Resume aur ID lekar aayein.", 0),
    ("Order deliver ho gaya hai. Kisi problem ke liye humse contact karein.", 0),
    ("Salary credit ho gayi hai aapke account mein. Bank statement check karein.", 0),
]

# ---------------------------------------------------------------------------
# Text Preprocessing
# ---------------------------------------------------------------------------

# Common Hinglish → normalized English mappings for scam-related terms
HINGLISH_MAP = {
    'paise': 'money', 'kamao': 'earn', 'kamaye': 'earn', 'kamai': 'earning',
    'ghar baithe': 'work from home', 'karo': 'do', 'bhejo': 'send',
    'abhi': 'now', 'turant': 'immediately', 'jaldi': 'quickly',
    'lottery': 'lottery', 'jeeti': 'won', 'jeeta': 'won',
    'munafa': 'profit', 'nivesh': 'invest', 'invest': 'invest',
    'fee': 'fee', 'register': 'register', 'otp': 'otp',
    'paaye': 'get', 'pao': 'get', 'cashback': 'cashback',
    'band': 'blocked', 'band ho jayega': 'will be blocked',
    'khata': 'account', 'account': 'account',
    'giraftari': 'arrest', 'giraftaari': 'arrest',
    'guaranteed': 'guaranteed', 'guarantee': 'guarantee',
    'double': 'double', 'dabbal': 'double',
    'naukri': 'job', 'job': 'job', 'kaam': 'work',
}


def preprocess_text(text: str) -> str:
    """Clean and normalise input text for improved feature extraction."""
    # Lowercase
    t = text.lower()

    # Normalise Unicode whitespace and newlines
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'\s+', ' ', t)

    # Normalise common obfuscations scammers use
    # e.g., "fr.ee" → "free", "w!n" → "win", "l0ttery" → "lottery"
    obfuscation_map = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
        '7': 't', '@': 'a', '$': 's', '!': 'i',
    }
    deobfuscated = []
    for ch in t:
        deobfuscated.append(obfuscation_map.get(ch, ch))
    t_deobf = ''.join(deobfuscated)

    # Remove excessive punctuation / emoji spam (keep one instance)
    t_deobf = re.sub(r'([!?.]){2,}', r'\1', t_deobf)

    # Strip leading/trailing whitespace
    return t_deobf.strip()


def compute_structural_features(text: str) -> Dict[str, float]:
    """Extract non-lexical structural signals from the raw text."""
    words = text.split()
    word_count = max(len(words), 1)

    caps_words = sum(1 for w in words if w.isupper() and len(w) > 1)
    exclamation_count = text.count('!')
    question_count = text.count('?')
    digit_ratio = sum(c.isdigit() for c in text) / max(len(text), 1)

    # Monetary value extraction
    money_values = re.findall(
        r'(?:₹|rs\.?|inr|lakh|crore|\$)\s*[\d,]+|[\d,]+\s*(?:₹|rs\.?|inr|lakh|crore|\$)',
        text, re.I,
    )
    max_money = 0.0
    for m in money_values:
        nums = re.findall(r'[\d,]+', m)
        for n in nums:
            val = float(n.replace(',', '')) if n.replace(',', '').isdigit() else 0
            if 'lakh' in m.lower():
                val *= 100_000
            elif 'crore' in m.lower():
                val *= 10_000_000
            max_money = max(max_money, val)

    return {
        'caps_ratio': caps_words / word_count,
        'exclamation_density': exclamation_count / word_count,
        'question_density': question_count / word_count,
        'digit_ratio': digit_ratio,
        'word_count': word_count,
        'has_large_money': 1.0 if max_money >= 10000 else 0.0,
        'money_magnitude': min(math.log10(max_money + 1) / 7, 1.0),  # normalised
        'url_count': len(URL_PATTERN.findall(text)),
        'phone_count': len([p for p in PHONE_PATTERN.findall(text) if len(p.strip()) >= 10]),
        'upi_count': len(UPI_PATTERN.findall(text)),
    }


# ---------------------------------------------------------------------------
# URL, phone & UPI patterns (improved)
# ---------------------------------------------------------------------------

URL_PATTERN = re.compile(
    r'(https?://[^\s]+|www\.[^\s]+|bit\.ly/[^\s]+|tinyurl\.com/[^\s]+|'
    r't\.me/[^\s]+|wa\.me/[^\s]+|tiny\.cc/[^\s]+|'
    r'[a-zA-Z0-9-]+\.(?:tk|ml|ga|cf|gq|xyz|top|buzz|click|link|info)/[^\s]*)',
    re.IGNORECASE,
)

PHONE_PATTERN = re.compile(
    r'(\+91[\-\s]?)?[6-9]\d{9}|\d{10,11}',
)

UPI_PATTERN = re.compile(
    r'[a-zA-Z0-9._-]+@(?:upi|paytm|oksbi|okhdfcbank|ybl|ibl|axl|okicici|apl)',
    re.IGNORECASE,
)

SUSPICIOUS_DOMAINS = [
    'bit.ly', 'tinyurl', 't.me', 'wa.me', 'telegram', 'tiny.cc',
    '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.buzz',
    '.click', '.link',
]


def extract_meta(text: str) -> Dict:
    """Extract URLs, phone numbers, UPI IDs, and suspicious indicators."""
    urls = URL_PATTERN.findall(text)
    phones = PHONE_PATTERN.findall(text)
    upi_ids = UPI_PATTERN.findall(text)
    suspicious_urls = [u for u in urls if any(d in u.lower() for d in SUSPICIOUS_DOMAINS)]

    return {
        'urls': urls,
        'phones': [p for p in phones if len(p.strip()) >= 10],
        'upi_ids': upi_ids,
        'suspicious_urls': suspicious_urls,
        'has_urgency': bool(re.search(
            r'\b(urgent|immediately|now|hurry|limited|expire[ds]?|block(?:ed)?|'
            r'arrest|suspend|disconnect|freeze|turant|jaldi|abhi|foran)\b',
            text, re.I,
        )),
        'has_money': bool(re.search(
            r'(₹|rs\.?|inr|lakh|crore|\$)\s*[\d,]+', text, re.I,
        )),
        'has_otp': bool(re.search(r'\botp\b', text, re.I)),
        'has_guarantee': bool(re.search(
            r'\b(100%|guarantee[ds]?|risk.?free|no.?risk|assured|pakka)\b',
            text, re.I,
        )),
        'has_threat': bool(re.search(
            r'\b(arrest|legal.?action|prosecution|police|cbi|fir|jail|'
            r'giraftari|kanuni karyawahi)\b',
            text, re.I,
        )),
    }


# ---------------------------------------------------------------------------
# Scam categories (expanded)
# ---------------------------------------------------------------------------

CATEGORIES = {
    'Job Scam': re.compile(
        r'(job|hiring|work from home|part.?time|naukri|salary|earn|income|'
        r'data entry|freelance|amazon|flipkart|typing|copy.?paste|'
        r'naukri|kaam|ghar baithe)', re.I,
    ),
    'KYC / Banking Fraud': re.compile(
        r'(kyc|account.?block|bank|sbi|hdfc|axis|icici|otp|aadhar|aadhaar|'
        r'pan.?card|verify|suspend|freeze|upi|khata.?band)', re.I,
    ),
    'Lottery / Prize': re.compile(
        r'(lottery|won|winner|prize|lucky draw|congratulations|reward|claim|'
        r'lucky|jeeti|jeeta|inam)', re.I,
    ),
    'Investment Fraud': re.compile(
        r'(invest|crypto|bitcoin|returns|profit|double|mlm|network.?market|'
        r'scheme|forex|trading|sip|mutual|100%|guaranteed.?return|'
        r'nivesh|munafa|dabbal)', re.I,
    ),
    'Phishing': re.compile(
        r'(click here|verify|login|password|credential|link|http|update.?now|'
        r'confirm.?identity|restore.?access|\.tk|\.ml|bit\.ly)', re.I,
    ),
    'Social Engineering': re.compile(
        r'(arrest|police|trai|court|legal|officer|government|cybercrime|'
        r'cbi|customs|income.?tax|prosecution|fir|giraftari)', re.I,
    ),
    'Advance Fee': re.compile(
        r'(fee|charge|deposit|advance|pay|send.?money|transfer|'
        r'processing.?fee|registration.?fee|courier.?charge|'
        r'security.?deposit)', re.I,
    ),
    'UPI / Digital Payment Scam': re.compile(
        r'(upi|paytm|phonepe|google.?pay|gpay|bhim|cashback|qr.?code|'
        r'collect.?request|payment.?link)', re.I,
    ),
}


def classify_categories(text: str) -> List[str]:
    """Classify the text into one or more scam categories."""
    cats = []
    for cat, pat in CATEGORIES.items():
        if pat.search(text):
            cats.append(cat)
    return cats or ['General Scam']


# ---------------------------------------------------------------------------
# Keyword banks for explainability (expanded)
# ---------------------------------------------------------------------------

KEYWORDS_EN = {
    # Job scams
    'urgent hiring': 0.9, 'work from home': 0.7, 'earn money fast': 0.95,
    'guaranteed income': 0.9, 'no experience needed': 0.75, 'easy money': 0.9,
    'part time job': 0.65, 'data entry': 0.5, 'immediate joining': 0.6,
    'copy paste work': 0.8, 'online typing job': 0.75, 'daily payment': 0.6,
    'no interview': 0.7, 'direct joining': 0.7, 'earn daily': 0.75,

    # Financial fraud
    'send money': 0.95, 'wire transfer': 0.85, 'advance fee': 0.95,
    'processing fee': 0.85, 'registration fee': 0.8, 'security deposit': 0.8,
    'courier charge': 0.75, 'delivery charge': 0.7,

    # Banking / KYC
    'kyc update': 0.9, 'account blocked': 0.85, 'verify your account': 0.8,
    'account suspended': 0.85, 'account frozen': 0.85,

    # Phishing
    'click here': 0.6, 'confirm identity': 0.7, 'restore access': 0.75,
    'update payment': 0.7,

    # Lottery / Prize
    'lottery winner': 0.95, 'you have won': 0.95, 'prize money': 0.9,
    'lucky draw': 0.9, 'claim your reward': 0.85, 'free iphone': 0.85,

    # Investment
    'investment opportunity': 0.75, 'double your money': 0.95,
    '100% profit': 0.95, 'guaranteed returns': 0.9,
    'zero risk': 0.9, 'no risk': 0.85,

    # Identity / Gov scam
    'otp': 0.7, 'aadhar': 0.5, 'aadhaar': 0.5, 'pan card': 0.5,
    'arrest': 0.9, 'legal action': 0.85, 'suspended': 0.8,
    'prosecution': 0.85, 'income tax': 0.6,

    # Digital scams
    'mlm': 0.85, 'network marketing': 0.7, 'refer and earn': 0.6,
    'crypto': 0.55, 'bitcoin': 0.55, 'forex': 0.6,

    # Platform mentions (not scam-inherent, but contextual)
    'whatsapp': 0.4, 'telegram': 0.5,

    # Urgency amplifiers
    'limited time offer': 0.7, 'act now': 0.65, 'last chance': 0.7,
    'expires today': 0.7, 'slots filling fast': 0.65,

    # UPI specific
    'upi': 0.4, 'collect request': 0.6, 'cashback': 0.45,
    'payment link': 0.55,
}

KEYWORDS_HI = {
    'पैसे कमाएं': 0.85, 'घर बैठे': 0.75, 'लॉटरी': 0.95,
    'इनाम': 0.8, 'केवाईसी': 0.9, 'खाता बंद': 0.85,
    'ओटीपी': 0.8, 'निवेश': 0.55, 'मुनाफा': 0.7,
    'रजिस्ट्रेशन फीस': 0.85, 'अग्रिम शुल्क': 0.9,
    'डबल पैसे': 0.95, 'क्रिप्टो': 0.6, 'सीमित समय': 0.65,
    'तुरंत': 0.45, 'गिरफ्तारी': 0.9, 'आधार कार्ड': 0.5,
    'गारंटीड रिटर्न': 0.9, 'बिना ब्याज': 0.7,
    'सरकारी योजना': 0.55, 'पैसे डबल': 0.95,
    'खाता बंद हो जाएगा': 0.9,
}

KEYWORDS_HINGLISH = {
    'ghar baithe': 0.75, 'paise kamao': 0.85, 'lottery jeeti': 0.95,
    'otp bhejo': 0.85, 'kyc update karo': 0.9, 'account band': 0.85,
    'invest karo': 0.65, 'munafa': 0.7, 'registration fee': 0.8,
    'turant': 0.45, 'giraftari': 0.9, 'guaranteed return': 0.9,
    'daily kamao': 0.75, 'cashback pao': 0.55, 'paisa double': 0.95,
    'online job': 0.6, 'whatsapp karo': 0.5,
}

# ---------------------------------------------------------------------------
# ML Pipeline
# ---------------------------------------------------------------------------

_pipeline: Pipeline | None = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'scam_model.pkl')


def _build_pipeline() -> Pipeline:
    """Train TF-IDF + Logistic Regression on the expanded corpus."""
    texts = [preprocess_text(x[0]) for x in TRAIN_DATA]
    labels = [x[1] for x in TRAIN_DATA]

    pipe = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=8000,
            sublinear_tf=True,
            analyzer='word',
            min_df=1,
            strip_accents='unicode',
        )),
        ('clf', LogisticRegression(
            C=1.5,
            max_iter=2000,
            class_weight='balanced',
            solver='lbfgs',
        )),
    ])
    pipe.fit(texts, labels)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(pipe, f)
    return pipe


def load_model():
    """Load or train the model pipeline. Returns (model, tokenizer)."""
    global _pipeline
    if _pipeline is None:
        # Always retrain to pick up corpus expansions
        _pipeline = _build_pipeline()
    return _pipeline, None   # (model, tokenizer) for API compat


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_language(text: str) -> str:
    """Detect language: 'hi' for Hindi, 'hinglish' for transliterated, 'en' for English."""
    hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
    total_alpha = max(len(re.findall(r'[a-zA-Z\u0900-\u097F]', text)), 1)
    hindi_ratio = hindi_chars / total_alpha

    if hindi_ratio > 0.15:
        return 'hi'

    # Hinglish detection: check for common transliterated words
    lower = text.lower()
    hinglish_markers = [
        'karo', 'kare', 'bhejo', 'kamao', 'paise', 'abhi', 'turant',
        'ghar baithe', 'nahi', 'aur', 'hai', 'mein', 'kya', 'yeh',
        'jayega', 'jayegi', 'karein', 'aayein', 'baje', 'paaye', 'pao',
    ]
    matches = sum(1 for m in hinglish_markers if m in lower)
    if matches >= 2:
        return 'hinglish'

    return 'en'


def predict_scam(model, _tokenizer, text: str, language: str = 'auto') -> Tuple[str, float]:
    """
    Predict whether text is a scam using a multi-signal ensemble:
      - ML model probability
      - Keyword-based score
      - Structural feature score
      - Metadata signal boost
    """
    if language == 'auto':
        language = detect_language(text)

    processed = preprocess_text(text)

    # ── Signal 1: ML model probability ──
    proba = model.predict_proba([processed])[0]
    ml_confidence = float(proba[1])

    # ── Signal 2: Keyword matching score ──
    bank = {**KEYWORDS_EN}
    if language in ('hi', 'hinglish'):
        bank.update(KEYWORDS_HI)
    if language == 'hinglish':
        bank.update(KEYWORDS_HINGLISH)

    lower = text.lower()
    matched_weights = [w for kw, w in bank.items() if kw.lower() in lower]
    keyword_score = sum(matched_weights)
    keyword_count = len(matched_weights)
    # Sigmoid-style normalisation: saturates around 1.0 for many matches
    keyword_conf = 1.0 - 1.0 / (1.0 + keyword_score) if keyword_score else 0.0

    # ── Signal 3: Structural features ──
    struct = compute_structural_features(text)
    structural_score = (
        0.15 * struct['caps_ratio'] +
        0.10 * min(struct['exclamation_density'], 1.0) +
        0.15 * struct['has_large_money'] +
        0.10 * struct['money_magnitude'] +
        0.15 * min(struct['url_count'] * 0.3, 1.0) +
        0.10 * min(struct['phone_count'] * 0.3, 1.0) +
        0.15 * min(struct['upi_count'] * 0.5, 1.0) +
        0.10 * struct['digit_ratio']
    )

    # ── Signal 4: Metadata boost ──
    meta = extract_meta(text)
    meta_boost = (
        0.15 * min(len(meta['suspicious_urls']), 2) / 2 +
        0.10 * meta['has_urgency'] +
        0.10 * meta['has_otp'] +
        0.20 * meta['has_guarantee'] +
        0.20 * meta['has_threat'] +
        0.10 * (len(meta.get('upi_ids', [])) > 0) +
        0.15 * meta['has_money']
    )

    # ── Ensemble with calibrated weights ──
    # keyword_count penalty: if no keywords match, reduce keyword influence
    kw_weight = 0.30 if keyword_count >= 2 else (0.20 if keyword_count == 1 else 0.05)
    ml_weight = 0.45 if keyword_count < 2 else 0.35

    final = (
        ml_weight * ml_confidence +
        kw_weight * keyword_conf +
        0.15 * structural_score +
        0.15 * meta_boost
    )
    # Normalise residual weight
    total_weight = ml_weight + kw_weight + 0.15 + 0.15
    final = final / total_weight

    final = min(final, 0.99)
    label = 'scam' if final >= 0.4 else 'legitimate'
    return label, round(final, 4)


def get_token_weights(text: str, language: str = 'en') -> Dict[str, float]:
    """Return matched keyword → weight pairs for explainability."""
    bank = {**KEYWORDS_EN}
    if language in ('hi', 'hinglish'):
        bank.update(KEYWORDS_HI)
    if language == 'hinglish':
        bank.update(KEYWORDS_HINGLISH)

    lower = text.lower()
    matched = {kw: w for kw, w in bank.items() if kw.lower() in lower}

    # Also add top TF-IDF features if model is loaded
    if _pipeline is not None:
        try:
            tfidf = _pipeline.named_steps['tfidf']
            clf = _pipeline.named_steps['clf']
            processed = preprocess_text(text)
            vec = tfidf.transform([processed])
            feature_names = tfidf.get_feature_names_out()
            coefs = clf.coef_[0]

            # Get non-zero features for this text
            nonzero = vec.nonzero()[1]
            for idx in nonzero:
                fname = feature_names[idx]
                importance = float(coefs[idx] * vec[0, idx])
                if importance > 0.1 and fname not in matched:
                    matched[f'[tfidf] {fname}'] = round(min(importance / 2, 0.95), 2)
        except Exception:
            pass  # graceful degradation

    return dict(sorted(matched.items(), key=lambda x: x[1], reverse=True))


def get_full_analysis(text: str, language: str = 'auto') -> Dict:
    """Return a comprehensive analysis of the input text."""
    if language == 'auto':
        language = detect_language(text)

    meta = extract_meta(text)
    structural = compute_structural_features(text)

    # Compute a threat breakdown for richer explainability
    threat_signals = []
    if meta['has_urgency']:
        threat_signals.append('Uses urgency/pressure tactics')
    if meta['has_money']:
        threat_signals.append('Contains monetary references')
    if meta['has_otp']:
        threat_signals.append('Requests OTP sharing')
    if meta['has_guarantee']:
        threat_signals.append('Makes unrealistic guarantees')
    if meta['has_threat']:
        threat_signals.append('Contains threats of legal/police action')
    if meta['suspicious_urls']:
        threat_signals.append(f'Contains {len(meta["suspicious_urls"])} suspicious URL(s)')
    if meta.get('upi_ids'):
        threat_signals.append('Contains UPI payment ID')
    if structural['caps_ratio'] > 0.3:
        threat_signals.append('Excessive use of CAPS (shouting)')
    if structural['exclamation_density'] > 0.2:
        threat_signals.append('Excessive exclamation marks')

    return {
        'detected_language': language,
        'categories': classify_categories(text),
        'meta': meta,
        'keywords': get_token_weights(text, language),
        'structural': structural,
        'threat_signals': threat_signals,
    }
