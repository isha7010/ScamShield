"""
Comprehensive Evaluation Suite for NLP Scam Detection Framework
Evaluates:
- Statistical Classification Metrics: Precision, Recall, F1 (Binary, Macro, Weighted)
- Confusion Matrix: TP, FP, TN, FN
- Threshold-Independent Metrics: ROC-AUC, PR-AUC
- Calibration Metrics: Brier Score, Log-Loss
- Slice-based Performance: English vs Hindi vs Hinglish
- Latency & Performance Benchmark: P50, P95, P99 latency (ms)
"""
import sys
import time
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
    precision_recall_curve,
    auc,
    brier_score_loss,
    log_loss,
)

from model import load_model, predict_scam, detect_language, get_full_analysis

# Curated evaluation dataset representing distinct scam vectors & legitimate communication
# Across English, Hindi, and Hinglish.
EVAL_DATASET = [
    # ── ENGLISH SCAMS (Label=1) ────────────────────────────────────────────────
    {"text": "Urgent hiring! Earn $5000 weekly from home. No experience needed. WhatsApp us now!", "label": 1, "lang": "en", "category": "Job Scam"},
    {"text": "Your Amazon order cannot be delivered. Update your card details at http://amaz0n-security.com", "label": 1, "lang": "en", "category": "Phishing"},
    {"text": "Dear customer, your SBI bank account is blocked. Click http://bit.ly/sbi-kyc to update PAN.", "label": 1, "lang": "en", "category": "Banking/KYC"},
    {"text": "Congratulations! You have won $1,000,000 in Google Annual Lottery. Send processing fee $100.", "label": 1, "lang": "en", "category": "Lottery/Prize"},
    {"text": "Guaranteed 500% profit in 24 hours with our crypto bot! Transfer 0.05 BTC to activate VIP.", "label": 1, "lang": "en", "category": "Investment"},
    {"text": "TRAI Notice: Your mobile connection will be terminated in 2 hours. Press 1 to speak to officer.", "label": 1, "lang": "en", "category": "Impersonation"},
    {"text": "Your Netflix membership expired. Renew immediately or your account will be deleted: http://tiny.cc/netf-sub", "label": 1, "lang": "en", "category": "Phishing"},
    {"text": "Final warning from Income Tax Dept: Arrest warrant issued. Pay settlement to evitar arrest.", "label": 1, "lang": "en", "category": "Impersonation"},
    {"text": "Data entry typing job. Earn Rs 1500 per day. No target. WhatsApp HR at +919876543210.", "label": 1, "lang": "en", "category": "Job Scam"},
    {"text": "Exclusive gift card! Claim your free Rs 10000 Flipkart voucher today: http://click-claim.xyz", "label": 1, "lang": "en", "category": "Lottery/Prize"},
    {"text": "You are selected for UNICEF remote internship. Pay Rs 1500 registration deposit via UPI.", "label": 1, "lang": "en", "category": "Advance Fee"},
    {"text": "HDFC Alert: Suspicious transaction detected. Share OTP with agent to cancel fraudulent charge.", "label": 1, "lang": "en", "category": "Banking/KYC"},

    # ── ENGLISH LEGITIMATE (Label=0) ──────────────────────────────────────────
    {"text": "Dear Priya, your job interview is scheduled for Tuesday at 11:00 AM via Google Meet.", "label": 0, "lang": "en", "category": "Professional"},
    {"text": "Your Zomato order has been picked up by the delivery partner and will reach in 15 mins.", "label": 0, "lang": "en", "category": "Transactional"},
    {"text": "Your monthly salary of Rs 75,000 has been credited to your HDFC account ending in 4091.", "label": 0, "lang": "en", "category": "Banking Alert"},
    {"text": "Your OTP for login to Tata Neu is 482019. Valid for 5 minutes. Do not share this with anyone.", "label": 0, "lang": "en", "category": "Authentication"},
    {"text": "Reminder: Quarterly project review meeting starts in 10 minutes in Conference Room 3.", "label": 0, "lang": "en", "category": "Professional"},
    {"text": "Your Uber ride with driver Rajesh (KA01MJ4921) is arriving now at your pickup location.", "label": 0, "lang": "en", "category": "Transactional"},
    {"text": "Your electricity bill for the period Sep-Oct is Rs 1,420. Due date: 28th October.", "label": 0, "lang": "en", "category": "Utility"},
    {"text": "Spotify: Your family plan subscription was successfully renewed for Rs 179 for this month.", "label": 0, "lang": "en", "category": "Subscription"},
    {"text": "Library notice: The book 'Clean Architecture' borrowed by you is due for return on Friday.", "label": 0, "lang": "en", "category": "Educational"},
    {"text": "Your appointment with Dr. Mehta has been confirmed for Thursday at 4:30 PM.", "label": 0, "lang": "en", "category": "Healthcare"},
    {"text": "GitHub: A new personal access token was generated from your account. Review details if not you.", "label": 0, "lang": "en", "category": "Security Alert"},
    {"text": "The sprint retrospective meeting notes and action items have been shared in Confluence.", "label": 0, "lang": "en", "category": "Professional"},

    # ── HINDI SCAMS (Label=1) ─────────────────────────────────────────────────
    {"text": "घर बैठे पैसे कमाएं! रोज ₹2500 की कमाई। अभी पंजीकरण करें और तुरंत ओटीपी भेजें।", "label": 1, "lang": "hi", "category": "Job Scam"},
    {"text": "बधाई हो! आपने 25 लाख की लॉटरी जीती है। राशि प्राप्त करने के लिए ₹2500 प्रोसेसिंग फीस दें।", "label": 1, "lang": "hi", "category": "Lottery/Prize"},
    {"text": "आपका बैंक खाता तुरंत ब्लॉक कर दिया जाएगा। पैन कार्ड अपडेट करने के लिए अभी क्लिक करें।", "label": 1, "lang": "hi", "category": "Banking/KYC"},
    {"text": "क्रिप्टो में निवेश करें, 24 घंटे में 100% गारंटीड मुनाफा। सीमित सीटें उपलब्ध!", "label": 1, "lang": "hi", "category": "Investment"},
    {"text": "सीबीआई जांच: आपके नाम पर मनी लॉन्ड्रिंग का मामला दर्ज। तुरंत संपर्क करें वरना गिरफ्तारी होगी।", "label": 1, "lang": "hi", "category": "Impersonation"},

    # ── HINDI LEGITIMATE (Label=0) ───────────────────────────────────────────
    {"text": "आपका इंटरव्यू सोमवार सुबह 10 बजे तय किया गया है। कृपया अपने शैक्षणिक प्रमाणपत्र साथ लाएं।", "label": 0, "lang": "hi", "category": "Professional"},
    {"text": "आपका आर्डर सफलतापूर्वक भेज दिया गया है। 2-3 दिनों में डिलीवरी की उम्मीद है।", "label": 0, "lang": "hi", "category": "Transactional"},
    {"text": "आपकी सैलरी बैंक खाते में जमा कर दी गई है। कृपया अपने बैंक विवरण की जांच करें।", "label": 0, "lang": "hi", "category": "Banking Alert"},
    {"text": "लॉगिन के लिए आपका ओटीपी 394821 है। यह केवल 10 मिनट के लिए मान्य है। किसी से साझा न करें।", "label": 0, "lang": "hi", "category": "Authentication"},
    {"text": "कल शाम 4 बजे सोसायटी की बैठक है। कृपया समय पर उपस्थित रहें।", "label": 0, "lang": "hi", "category": "Community"},

    # ── HINGLISH SCAMS (Label=1) ──────────────────────────────────────────────
    {"text": "Ghar baithe paise kamao! Roz 3000 ki kamai guarantee. Abhi WhatsApp karo aur join ho.", "label": 1, "lang": "hinglish", "category": "Job Scam"},
    {"text": "Aapka KYC expire ho gaya hai warna account band ho jayega. Turant click karo aur verify karo.", "label": 1, "lang": "hinglish", "category": "Banking/KYC"},
    {"text": "Lottery jeet gaye ho Rs 10 lakh ki! Claim karne ke liye 1000 rs registration fee bhejo abhi.", "label": 1, "lang": "hinglish", "category": "Lottery/Prize"},
    {"text": "Crypto mein invest karo, double money in 7 days guaranteed. Telegram group join karo.", "label": 1, "lang": "hinglish", "category": "Investment"},
    {"text": "TRAI alert: Aapka mobile number 2 ghante mein band hoga. Turant call karein officer ko.", "label": 1, "lang": "hinglish", "category": "Impersonation"},

    # ── HINGLISH LEGITIMATE (Label=0) ─────────────────────────────────────────
    {"text": "Aapka interview Monday ko 11 baje schedule hai. Resume aur ID lekar aana mat bhoolna.", "label": 0, "lang": "hinglish", "category": "Professional"},
    {"text": "Aapka Swiggy order deliver hone wala hai. Delivery partner aapke gate par hai.", "label": 0, "lang": "hinglish", "category": "Transactional"},
    {"text": "Salary credit ho gayi hai account mein. Passbook update kar lena.", "label": 0, "lang": "hinglish", "category": "Banking Alert"},
    {"text": "Aapka verification OTP 918234 hai. Kripya ise kisi ke sath share na karein.", "label": 0, "lang": "hinglish", "category": "Authentication"},
    {"text": "Kal subah 10 baje team meeting Google Meet par hogi. Link email par bhej diya hai.", "label": 0, "lang": "hinglish", "category": "Professional"},
]


def run_evaluation():
    print("=" * 80)
    print("       SCAM SHIELD NLP FRAMEWORK - COMPREHENSIVE EVALUATION SUITE       ")
    print("=" * 80)

    model, tokenizer = load_model()

    y_true = []
    y_pred = []
    y_scores = []
    latencies = []
    slice_data = {"en": {"true": [], "pred": [], "scores": []},
                  "hi": {"true": [], "pred": [], "scores": []},
                  "hinglish": {"true": [], "pred": [], "scores": []}}

    for item in EVAL_DATASET:
        text = item["text"]
        target = item["label"]
        lang_group = item["lang"]

        # Measure inference latency per sample
        t0 = time.perf_counter()
        pred_label, conf = predict_scam(model, tokenizer, text, "auto")
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

        # In hybrid engine, conf is scam confidence (probability of scam)
        # If label is 'legitimate', scam probability is 1.0 - conf
        scam_prob = conf if pred_label == "scam" else (1.0 - conf)
        pred_binary = 1 if pred_label == "scam" else 0

        y_true.append(target)
        y_pred.append(pred_binary)
        y_scores.append(scam_prob)

        slice_data[lang_group]["true"].append(target)
        slice_data[lang_group]["pred"].append(pred_binary)
        slice_data[lang_group]["scores"].append(scam_prob)

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_scores = np.array(y_scores)

    # ── 1. Classification Metrics ──
    acc = accuracy_score(y_true, y_pred)
    prec_scam = precision_score(y_true, y_pred, pos_label=1)
    rec_scam = recall_score(y_true, y_pred, pos_label=1)
    f1_scam = f1_score(y_true, y_pred, pos_label=1)

    prec_legit = precision_score(y_true, y_pred, pos_label=0)
    rec_legit = recall_score(y_true, y_pred, pos_label=0)
    f1_legit = f1_score(y_true, y_pred, pos_label=0)

    macro_f1 = f1_score(y_true, y_pred, average="macro")
    weighted_f1 = f1_score(y_true, y_pred, average="weighted")

    # ── 2. Confusion Matrix ──
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    # ── 3. Threshold-independent & Calibration Metrics ──
    roc_auc = roc_auc_score(y_true, y_scores)
    prec_curve, rec_curve, _ = precision_recall_curve(y_true, y_scores)
    pr_auc = auc(rec_curve, prec_curve)
    brier = brier_score_loss(y_true, y_scores)
    loss = log_loss(y_true, np.clip(y_scores, 1e-6, 1.0 - 1e-6))

    # ── 4. Latency ──
    p50_lat = np.percentile(latencies, 50)
    p95_lat = np.percentile(latencies, 95)
    p99_lat = np.percentile(latencies, 99)
    mean_lat = np.mean(latencies)

    # ── Output Results ──
    print(f"\n[1] Overall Statistical Metrics (Test Set Size = {len(y_true)}):")
    print(f"  • Overall Accuracy:          {acc * 100:.2f}%")
    print(f"  • Macro F1-Score:            {macro_f1:.4f}")
    print(f"  • Weighted F1-Score:         {weighted_f1:.4f}")
    print(f"  • ROC-AUC Score:             {roc_auc:.4f}")
    print(f"  • PR-AUC (Precision-Recall): {pr_auc:.4f}")
    print(f"  • Calibration (Brier Score): {brier:.4f}  (lower is better)")
    print(f"  • Log-Loss (Cross-Entropy):  {loss:.4f}   (lower is better)")

    print(f"\n[2] Per-Class Breakdown:")
    print(f"  +------------+-----------+--------+----------+---------+")
    print(f"  | Class      | Precision | Recall | F1-Score | Samples |")
    print(f"  +------------+-----------+--------+----------+---------+")
    print(f"  | Legitimate | {prec_legit*100:8.2f}% | {rec_legit*100:5.2f}% | {f1_legit:8.4f} | {int(tn+fp):7d} |")
    print(f"  | Scam       | {prec_scam*100:8.2f}% | {rec_scam*100:5.2f}% | {f1_scam:8.4f} | {int(fn+tp):7d} |")
    print(f"  +------------+-----------+--------+----------+---------+")

    print(f"\n[3] Confusion Matrix:")
    print(f"  True Negatives  (Legitimate correctly passed): {tn}")
    print(f"  False Positives (Legitimate falsely blocked):   {fp}")
    print(f"  False Negatives (Scam missed / slipped through): {fn}")
    print(f"  True Positives  (Scam correctly caught):        {tp}")

    print(f"\n[4] Linguistic Slice Evaluation (Subpopulation F1-Scores):")
    for lang, data in slice_data.items():
        sub_true = np.array(data["true"])
        sub_pred = np.array(data["pred"])
        sub_acc = accuracy_score(sub_true, sub_pred)
        sub_f1 = f1_score(sub_true, sub_pred, average="macro")
        sub_prec = precision_score(sub_true, sub_pred, pos_label=1, zero_division=0)
        sub_rec = recall_score(sub_true, sub_pred, pos_label=1, zero_division=0)
        lang_name = {"en": "English", "hi": "Hindi (Devanagari)", "hinglish": "Hinglish (Code-mixed)"}[lang]
        print(f"  • {lang_name:<26} Accuracy: {sub_acc*100:5.1f}% | Macro F1: {sub_f1:.4f} | Scam Prec: {sub_prec*100:5.1f}% | Scam Rec: {sub_rec*100:5.1f}%")

    print(f"\n[5] Operational Inference Latency (Benchmark on CPU):")
    print(f"  • P50 (Median) Latency:      {p50_lat:.3f} ms")
    print(f"  • P95 Latency:               {p95_lat:.3f} ms")
    print(f"  • P99 Latency:               {p99_lat:.3f} ms")
    print(f"  • Mean Latency:              {mean_lat:.3f} ms")
    print(f"  • Estimated Throughput:      ~{int(1000.0 / mean_lat):,d} requests/sec per core")

    print("\n" + "=" * 80)
    print("                            EVALUATION COMPLETE                         ")
    print("=" * 80)


if __name__ == "__main__":
    run_evaluation()
