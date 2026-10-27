"""Quick validation of the improved NLP framework."""
from model import load_model, predict_scam, get_full_analysis, detect_language

print("Loading model...")
m, t = load_model()
print("Model loaded successfully!\n")

tests = [
    ("Urgent hiring! Earn Rs 5000 daily. No experience. Send OTP now.", "scam"),
    ("Your interview is scheduled for Monday 10am. Please bring your resume.", "legit"),
    ("Ghar baithe paise kamao! Roz 2000 ki kamai. OTP bhejo abhi.", "scam"),
    ("Aapka interview Monday ko 10 baje hai. Resume lekar aayein.", "legit"),
    ("KYC update karo warna account band. Turant click karo: http://bit.ly/kyc", "scam"),
    ("Your order has been shipped. Expected delivery in 3-5 business days.", "legit"),
    ("Congratulations! You won Rs 1 crore! Pay Rs 2000 processing fee to claim.", "scam"),
    ("Your salary has been credited. Check bank statement.", "legit"),
]

print("=" * 70)
passed = 0
for text, expected in tests:
    lang = detect_language(text)
    label, conf = predict_scam(m, t, text, "auto")
    expected_label = "scam" if expected == "scam" else "legitimate"
    ok = label == expected_label
    passed += ok
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] ({lang:>8}) conf={conf:.4f} label={label:>10}  | {text[:60]}...")

print(f"\n{passed}/{len(tests)} tests passed\n")

# Full analysis demo
print("=" * 70)
demo = "KYC update karo warna account band ho jayega. Turant click karo: http://bit.ly/kyc"
analysis = get_full_analysis(demo, "auto")
print(f"Full analysis of: {demo[:60]}...")
print(f"  Language: {analysis['detected_language']}")
print(f"  Categories: {analysis['categories']}")
print(f"  Threat signals: {analysis['threat_signals']}")
print(f"  Keywords: {list(analysis['keywords'].keys())[:8]}")
print(f"  Structural: caps_ratio={analysis['structural']['caps_ratio']:.2f}, "
      f"digit_ratio={analysis['structural']['digit_ratio']:.2f}")
