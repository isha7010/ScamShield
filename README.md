# ScamShield AI 

# 🛡️ ScamShield AI
### *Explainable, Multilingual Social Scam & Fraud Intelligence Platform*

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Inference Latency](https://img.shields.io/badge/Latency-~1.3ms-success?style=for-the-badge&logo=speedtest&logoColor=white)](https://github.com/isha7010/ScamShield)
[![Precision](https://img.shields.io/badge/Scam_Precision-100%25-brightgreen?style=for-the-badge)](https://github.com/isha7010/ScamShield)

<p align="center">
  <b>Detect deceptive messages before they cause financial harm.</b><br>
  Built for modern digital communication across WhatsApp, Telegram, SMS, and Social Media.
</p>

[Quick Start](#-quick-start-guide) • [Architecture](#-hybrid-ai-architecture) • [Key Features](#-key-features) • [Benchmarks](#-benchmark-performance) • [API Reference](#-api-reference)

---

## Features

## 📌 The Problem: Why ScamShield?

Every day, millions of digital users across India and globally receive deceptive communications:
- *"Urgent! Work from home, earn ₹3000/day. Send OTP to register."*
- *"SBI Alert: Your account is blocked. Update PAN immediately via bit.ly/sbi-kyc"*
- *"Aapka lottery nikal gaya hai, 25 lakh claim karne ke liye transfer fees bhejo."*

### Why Traditional Filters Fail:
1. **Code-Mixed Language Barrier**: Scammers frequently mix English, Hindi, and Hinglish in a single sentence. Standard English-only spam filters miss these.
2. **Psychological Manipulation**: Scammers exploit **urgency**, **fear of legal action**, and **unrealistic financial greed**.
3. **The "Black Box" Problem**: Users are told a message is spam, but never told *why*—leaving them vulnerable to slightly altered variations.

**ScamShield AI** solves this with a **transparent, multilingual, hybrid NLP pipeline** that classifies threats, isolates specific manipulation signals, and explains its reasoning token by token.

---

##  Prerequisites

- 🌐 **Multilingual & Code-Mixed Support**: Native support for **English**, **Hindi (Devanagari)**, and **Hinglish (Romanized Hindi)** with automatic language detection.
- 🧠 **Hybrid 3-Layer NLP Architecture**: Combines statistical machine learning with domain-specific heuristic parsers and structural text analysis.
- 🔍 **Explainable AI (XAI)**:
  - Transparent token-attribution weights showing which exact words triggered the verdict.
  - Granular threat signals: *Urgency Tactics*, *OTP Sharing Request*, *Suspicious URL Shorteners*, *UPI Payment IDs*, and *Intimidation*.
- 🎯 **7 Scam Category Classifications**:
  - 💼 Job Scams
  - 🏦 KYC & Banking Fraud
  - 🎁 Lottery & Prize Traps
  - 📈 Investment & Crypto Fraud
  - 🎣 Phishing & Credential Harvesting
  - 🎭 Social Engineering & Authority Impersonation
  - 💸 Advance Fee Fraud
- ⚡ **Ultra-Low Latency (~1.3ms)**: Lightweight CPU inference designed for real-time scanning in messaging platforms.
- 📊 **Cyber-Shield Web Console**: Modern interactive dashboard with risk gauges, confidence meters, scan history, and one-click incident report exports.

---

## 🏛️ Hybrid AI Architecture

```text
       ┌────────────────────────────────────────────────────────┐
       │             Incoming Suspicious Message                │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     1. Preprocessing & Extraction                      │
 │   • Language Detection (EN / HI / Hinglish)                            │
 │   • UPI ID & Phone Extractor (@okaxis, @ybl, +91...)                  │
 │   • URL Parser & Suspicious Shortlink Flagging (bit.ly, tinyurl...)    │
 │   • Structural Profiler (Capitalization ratio, punctuation density)    │
 └────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    2. Multi-Engine Threat Scorer                       │
 │                                                                        │
 │  ┌───────────────────────┐  ┌────────────────────┐  ┌───────────────┐ │
 │  │ TF-IDF ML Classifier  │  │   Heuristic Rules  │  │  Structural   │ │
 │  │ (n-gram token scoring)│  │ (Urgency & Threat) │  │ (Text Metrics)│ │
 │  └───────────┬───────────┘  └─────────┬──────────┘  └───────┬───────┘ │
 └──────────────┼────────────────────────┼─────────────────────┼─────────┘
                └───────────────────┐    │    ┌────────────────┘
                                    ▼    ▼    ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    3. Decision & Explainability Engine                 │
 │   • Calibrated Confidence Score (0.0 to 1.0)                           │
 │   • Verdict: Legitimate vs Potential Scam                              │
 │   • Category Attribution (Job, KYC, Lottery, etc.)                     │
 │   • Token-by-Token Weight Attribution                                  │
 └────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │   Interactive Cyber-Shield UI / REST API Response      │
       └────────────────────────────────────────────────────────┘
```

---

## 📊 Benchmark Performance

Evaluated against a curated multi-vector dataset containing English, Hindi, and Hinglish messages across diverse threat scenarios:

| Metric | Score | Note |
| :--- | :---: | :--- |
| **Scam Precision** | **100.0%** | **Zero false alarms** on legitimate messages |
| **Legitimate Recall** | **100.0%** | Legitimate transactions and work emails are never blocked |
| **Overall Accuracy** | **79.55%** | Robust baseline across cross-lingual evaluation set |
| **Hinglish Accuracy** | **90.0%** | Exceptional performance on romanized Indian communication |
| **Mean CPU Latency** | **1.30 ms** | Capable of **~767 requests/sec** per single CPU core |
| **P95 Latency** | **1.79 ms** | Predictable, steady real-time execution |

---

## ⚡ Quick Start Guide

### Prerequisites
Make sure you have installed:
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)

---

### Step 1: Start the Backend (FastAPI)

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. *(Recommended)* Create a virtual environment:
   ```bash
   # Windows:
   python -m venv .venv
   .venv\Scripts\activate

   # macOS / Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   uvicorn app:app --reload --port 8000
   ```
   > 🚀 API is now running at `http://127.0.0.1:8000`  
   > 📖 Interactive Swagger docs available at `http://127.0.0.1:8000/docs`

---

### Step 2: Start the Web Dashboard (React + Vite)

1. Open a second terminal in the project root directory:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and go to:
   ```text
   http://localhost:5173
   ```

---

##  Running Tests & Evaluation

### `POST /detect`
Analyzes any message and returns risk categorization, threat markers, and explainability weights.

#### Request:
```json
{
  "text": "Urgent hiring! Work from home, earn Rs 3000 daily. Send OTP to register now!",
  "lang": "auto"
}
```

#### Response:
```json
{
  "label": "scam",
  "confidence": 0.94,
  "detected_language": "en",
  "categories": ["Job Scam", "Advance Fee"],
  "explanation": {
    "urgent": 0.35,
    "otp": 0.32,
    "earn": 0.22,
    "daily": 0.18
  },
  "threat_signals": [
    "Uses urgency/pressure tactics",
    "Contains monetary references",
    "Requests OTP sharing"
  ],
  "meta": {
    "urls": [],
    "phones": [],
    "upi_ids": [],
    "suspicious_urls": [],
    "has_urgency": true,
    "has_money": true,
    "has_otp": true,
    "has_guarantee": false,
    "has_threat": false
  }
}
```

---

## 🧪 Running Tests & Benchmarks

To run the automated test suite and classification benchmark suite:

```bash
cd backend

# Run functional unit tests:
python test_model.py

# Run comprehensive metric benchmark suite:
python evaluate_framework.py
```

---

## 📁 Repository Structure

```text
ScamShield/
├── backend/
│   ├── app.py                   # FastAPI REST API with CORS configuration
│   ├── model.py                 # Hybrid NLP detection pipeline & heuristic engine
│   ├── scam_model.pkl           # Trained offline ML classifier weights
│   ├── evaluate_framework.py    # Benchmark evaluation (Precision, Latency, Confusion Matrix)
│   ├── test_model.py            # Unit test suite
│   └── requirements.txt         # Backend Python dependencies
├── src/
│   ├── App.tsx                  # Main React application & Scam Console
│   ├── App.css                  # Custom styling, radar animations, and UI tokens
│   ├── index.css                # Typography & base stylesheet
│   └── main.tsx                 # React entry point
├── public/                      # Static assets & icons
├── package.json                 # Frontend dependencies & scripts
├── vite.config.ts               # Vite bundler configuration
└── README.md                    # Project documentation
```

---

## 🤝 Contributing & License

Contributions, feedback, and issue reports are welcome! Feel free to open an issue or pull request.  
Licensed under the [MIT License](LICENSE).
