# ScamShield AI 

> **Explainable, Multilingual Social Scam & Fraud Detection Framework**  
> An intelligent system to detect job scams, advance fee fraud, KYC phishing, and social engineering in Indian digital communication (English, Hindi, and Hinglish).

---

## Features

- **Hybrid 3-Layer NLP Engine**:
  - **TF-IDF + Calibrated Classifier**: Statistical n-gram patterns trained on scam corpora.
  - **Rule-Based Heuristic Parser**: Regex and pattern-based extraction for UPI IDs, suspicious shortlinks, urgency indicators, and financial coercion.
  - **Structural Text Analyzer**: Analyzes capitalization ratios, punctuation density, and token distribution.
- **Explainable AI (XAI)**:
  - Transparent token-level attribution weights for every classification.
  - Granular threat signals explaining *why* a message is classified as dangerous.
- **Multi-Category Classification**:
  - Job Scams, KYC / Banking Fraud, Lottery / Prize Schemes, Investment Fraud, Phishing, Social Engineering, and Advance Fee Fraud.
- **Interactive Cyber-Shield Web Console**:
  - React + TypeScript dashboard with real-time risk gauge, threat breakdown, copyable reports, and scan history.

---

##  Prerequisites

Before running the project, make sure you have installed:
- **Node.js** (v18 or higher) and **npm**
- **Python** (v3.9 or higher)

---

## ⚡ Quick Start Guide

To run the project locally, you need to start both the **Backend** and the **Frontend**.

### 1. Backend Setup (FastAPI & ML Engine)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. (Optional but recommended) Create and activate a virtual environment:
   - **Windows**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn app:app --reload --port 8000
   ```
   *The backend will be running at `http://127.0.0.1:8000`. You can also view interactive API docs at `http://127.0.0.1:8000/docs`.*

---

### 2. Frontend Setup (React + Vite)

1. Open a new terminal in the root project directory:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

---

##  Running Tests & Evaluation

To verify the machine learning model and run accuracy evaluations:

```bash
cd backend
python test_model.py
python evaluate_framework.py
```

---

## 📂 Project Structure

```text
social-scam-detector/
├── backend/
│   ├── app.py                   # FastAPI application & REST endpoints
│   ├── model.py                 # Hybrid NLP detection pipeline & heuristic rules
│   ├── scam_model.pkl           # Offline trained ML model weights
│   ├── evaluate_framework.py    # Metric benchmarks (Precision, Recall, F1)
│   ├── test_model.py            # Unit & integration tests for detection
│   └── requirements.txt         # Python dependencies
├── src/
│   ├── App.tsx                  # Main React dashboard & analytics UI
│   ├── App.css                  # UI styles, radar scanner animations, and themes
│   ├── index.css                # Global base styles & variables
│   └── main.tsx                 # React entry point
├── public/                      # Static assets & icons
├── package.json                 # Node dependencies and build scripts
└── vite.config.ts               # Vite configuration
```
