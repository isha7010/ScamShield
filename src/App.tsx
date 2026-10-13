import { useState, useRef, useEffect } from 'react'
import './App.css'

/* ─── Types ────────────────────────────────────────────────────────────── */
interface DetectResponse {
  label: 'scam' | 'legitimate'
  confidence: number
  explanation: Record<string, number>
}

interface HistoryItem extends DetectResponse {
  text: string
  lang: string
  ts: number
}

/* ─── Constants ────────────────────────────────────────────────────────── */
const API_URL = 'http://127.0.0.1:8000/detect'

const EXAMPLES = {
  en: [
    'Urgent hiring! Work from home, earn money fast. No experience needed. Send OTP to register now!',
    'Dear candidate, your interview is scheduled for Monday 10am. Please bring your resume and ID.',
    'Congratulations! You have won a lottery prize of ₹50,000. Send registration fee of ₹500 to claim.',
  ],
  hi: [
    'घर बैठे पैसे कमाएं! रोज ₹2000 की कमाई। अभी रजिस्ट्रेशन करें और ओटीपी भेजें।',
    'आपका इंटरव्यू सोमवार को है। कृपया अपना बायोडेटा और पहचान पत्र लाएं।',
  ],
}

/* ─── Helper ───────────────────────────────────────────────────────────── */
function riskLevel(conf: number) {
  if (conf >= 0.8) return 'Critical Risk'
  if (conf >= 0.6) return 'High Risk'
  if (conf >= 0.4) return 'Moderate Risk'
  return 'Low Risk'
}

/* ─── App ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectResponse | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [stats, setStats] = useState({ total: 0, scams: 0, legit: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* Load history from localStorage */
  useEffect(() => {
    const saved = localStorage.getItem('scam-history')
    if (saved) {
      const h: HistoryItem[] = JSON.parse(saved)
      setHistory(h)
      setStats({
        total: h.length,
        scams: h.filter(x => x.label === 'scam').length,
        legit: h.filter(x => x.label === 'legitimate').length,
      })
    }
  }, [])

  /* ── API call ─────────────────────────────────────── */
  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data: DetectResponse = await res.json()
      setResult(data)

      const item: HistoryItem = { ...data, text, lang, ts: Date.now() }
      const newHistory = [item, ...history].slice(0, 20)
      setHistory(newHistory)
      localStorage.setItem('scam-history', JSON.stringify(newHistory))
      setStats({
        total: newHistory.length,
        scams: newHistory.filter(x => x.label === 'scam').length,
        legit: newHistory.filter(x => x.label === 'legitimate').length,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect to API. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const loadExample = (ex: string) => {
    setText(ex)
    textareaRef.current?.focus()
  }

  const scam = result?.label === 'scam'
  const sortedKeywords = result
    ? Object.entries(result.explanation).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : []

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────── */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <div className="logo-text">ScamShield AI</div>
            <div className="logo-sub">Multilingual Scam Detector</div>
          </div>
        </div>
        <div className="header-badge">
          <span />
          API Live · Rule Engine v1.0
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">🔍 NLP Framework</div>
        <h1>
          Detect <span>Social Scams</span><br />Before They Harm
        </h1>
        <p>
          An explainable multilingual framework for detecting job scams &amp;
          social engineering in Indian digital communication.
        </p>
      </section>

      {/* ── Main ───────────────────────────────────── */}
      <main className="main">
        {/* Left column */}
        <div>
          {/* Input card */}
          <div className="card input-panel animate-in">
            <div className="card-header">
              <div className="dot" /> Analyze Message
            </div>

            <div style={{ height: 16 }} />

            {/* Language toggle */}
            <div className="lang-row">
              {(['en', 'hi'] as const).map(l => (
                <button
                  key={l}
                  className={`lang-btn ${lang === l ? 'active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l === 'en' ? '🇬🇧 English' : '🇮🇳 Hindi'}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="textarea-wrap">
              <textarea
                ref={textareaRef}
                className="input-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Paste a suspicious message, job offer, or WhatsApp forward here…'
                    : 'यहाँ संदिग्ध संदेश, नौकरी की पेशकश या व्हाट्सएप फॉरवर्ड पेस्ट करें…'
                }
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyze()
                }}
              />
              <span className="char-count">{text.length} chars</span>
            </div>

            {/* Examples */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Try an example:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EXAMPLES[lang].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => loadExample(ex)}
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border2)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: 'var(--text-dim)',
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'border-color 0.2s',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,45,85,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                  >
                    {ex.length > 90 ? ex.slice(0, 90) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(255,45,85,0.08)',
                border: '1px solid rgba(255,45,85,0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#ff6b6b',
                marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Analyze button */}
            <button
              className="analyze-btn"
              onClick={analyze}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <><div className="spinner" /> Analyzing…</>
              ) : (
                <> 🔍 Analyze Message &nbsp;<span style={{ opacity: 0.6, fontSize: 12 }}>Ctrl+Enter</span></>
              )}
            </button>
          </div>

          {/* Result card */}
          {result && (
            <div className="card result-panel animate-in" style={{ marginTop: 20 }}>
              {/* Verdict */}
              <div className={`verdict-banner ${scam ? 'scam' : 'legit'}`}>
                <div className="verdict-icon">{scam ? '🚨' : '✅'}</div>
                <div className="verdict-info">
                  <h3>{scam ? 'Scam Detected' : 'Looks Legitimate'}</h3>
                  <p>
                    {scam
                      ? 'This message shows strong indicators of a scam or social engineering attempt.'
                      : 'No significant scam indicators were found in this message.'}
                  </p>
                </div>
                <div className="verdict-badge">
                  {scam ? riskLevel(result.confidence) : 'Safe'}
                </div>
              </div>

              {/* Confidence */}
              <div className="confidence-section">
                <h4>Confidence Score</h4>
                <div className="conf-stats" style={{ marginBottom: 8 }}>
                  <span className="conf-pct">{(result.confidence * 100).toFixed(1)}%</span>
                  <span className="conf-label">{scam ? 'Scam probability' : 'Legitimate probability'}</span>
                </div>
                <div className="conf-bar-wrap">
                  <div
                    className={`conf-bar-fill ${scam ? '' : 'legit'}`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                {scam && sortedKeywords.length > 0 && (
                  <div className="risk-tags">
                    {sortedKeywords.slice(0, 4).map(([kw]) => (
                      <span key={kw} className="risk-tag">{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div className="explanation-section">
                <h4>
                  {sortedKeywords.length > 0
                    ? `Keyword Triggers (${sortedKeywords.length} found)`
                    : 'No Scam Keywords Found'}
                </h4>
                {sortedKeywords.length > 0 ? (
                  sortedKeywords.map(([kw, w], i) => (
                    <div className="keyword-row" key={kw} style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="keyword-label" title={kw}>{kw}</span>
                      <div className="keyword-bar-wrap">
                        <div
                          className="keyword-bar-fill"
                          style={{ width: `${w * 100}%`, animationDelay: `${i * 60}ms` }}
                        />
                      </div>
                      <span className="keyword-weight">{(w * 100).toFixed(0)}%</span>
                    </div>
                  ))
                ) : (
                  <div className="no-keywords">
                    ✓ No suspicious keywords detected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────── */}
        <aside className="sidebar">
          {/* Stats */}
          <div>
            <div className="card-header" style={{ paddingLeft: 0, marginBottom: 12 }}>
              <div className="dot" /> Session Stats
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="label">Analyzed</div>
                <div className="value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="label">Scams Found</div>
                <div className="value red">{stats.scams}</div>
              </div>
              <div className="stat-card">
                <div className="label">Legitimate</div>
                <div className="value green">{stats.legit}</div>
              </div>
              <div className="stat-card">
                <div className="label">Scam Rate</div>
                <div className="value pink">
                  {stats.total ? Math.round((stats.scams / stats.total) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="card how-card">
            <h3>⚙️ How It Works</h3>
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-text">
                <strong>Text Input</strong>
                <span>Paste any message in English or Hindi</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-text">
                <strong>NLP Analysis</strong>
                <span>Weighted keyword engine scans for scam patterns</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text">
                <strong>Explainability</strong>
                <span>See exactly which keywords triggered the alert</span>
              </div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div className="step-text">
                <strong>Risk Score</strong>
                <span>Sigmoid-weighted confidence from 0–100%</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card history-card">
            <h3>📋 Recent Analyses</h3>
            {history.length === 0 ? (
              <div className="empty-history">No analyses yet. Try a message above!</div>
            ) : (
              history.slice(0, 8).map((item, i) => (
                <div
                  key={item.ts}
                  className="history-item"
                  onClick={() => {
                    setText(item.text)
                    setLang(item.lang as 'en' | 'hi')
                    setResult({ label: item.label, confidence: item.confidence, explanation: item.explanation })
                  }}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={`history-dot ${item.label === 'scam' ? 'scam' : 'legit'}`} />
                  <span className="history-text">{item.text}</span>
                  <span className="history-conf">{(item.confidence * 100).toFixed(0)}%</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="footer">
        ScamShield AI · Explainable NLP Framework for Indian Digital Communication ·{' '}
        <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
      </footer>
    </div>
  )
}
