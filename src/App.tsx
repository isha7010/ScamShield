import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import './App.css'

/* ─── Types ──────────────────────────────────────────────── */
interface StructuralInfo {
  caps_ratio: number
  exclamation_density: number
  question_density: number
  digit_ratio: number
  word_count: number
  has_large_money: number
  money_magnitude: number
  url_count: number
  phone_count: number
  upi_count: number
}

interface MetaInfo {
  urls: string[]
  phones: string[]
  upi_ids: string[]
  suspicious_urls: string[]
  has_urgency: boolean
  has_money: boolean
  has_otp: boolean
  has_guarantee: boolean
  has_threat: boolean
}

interface DetectResponse {
  label: 'scam' | 'legitimate'
  confidence: number
  explanation: Record<string, number>
  categories?: string[]
  detected_language?: string
  meta?: MetaInfo
  structural?: StructuralInfo
  threat_signals?: string[]
}

interface HistoryItem extends DetectResponse {
  text: string
  lang: string
  ts: number
}

type Page = 'analyze' | 'history' | 'dashboard' | 'about'
type HistoryFilter = 'all' | 'scam' | 'legit'

/* ─── Constants ──────────────────────────────────────────── */
const API_URL = 'http://127.0.0.1:8000/detect'

const EXAMPLES = {
  en: [
    { text: 'Urgent hiring! Work from home, earn money fast. No experience needed. Send OTP to register now!', type: 'scam' as const },
    { text: 'Dear candidate, your interview is scheduled for Monday 10am. Please bring your resume and ID.', type: 'legit' as const },
    { text: 'Congratulations! You have won a lottery prize of ₹50,000. Send registration fee of ₹500 to claim.', type: 'scam' as const },
  ],
  hi: [
    { text: 'घर बैठे पैसे कमाएं! रोज ₹2000 की कमाई। अभी रजिस्ट्रेशन करें और ओटीपी भेजें।', type: 'scam' as const },
    { text: 'आपका इंटरव्यू सोमवार को है। कृपया अपना बायोडेटा और पहचान पत्र लाएं।', type: 'legit' as const },
  ],
}

const SCAM_CATEGORIES = [
  { label: 'Job Scam' },
  { label: 'KYC / Banking Fraud' },
  { label: 'Lottery / Prize' },
  { label: 'Investment Fraud' },
  { label: 'Phishing' },
  { label: 'Social Engineering' },
  { label: 'Advance Fee' },
]

const CATEGORY_COLORS: Record<string, string> = {
  'Job Scam': '#C2185B',
  'KYC / Banking Fraud': '#B45309',
  'Lottery / Prize': '#7C3AED',
  'Investment Fraud': '#4F46E5',
  'Phishing': '#0891B2',
  'Social Engineering': '#E75480',
  'Advance Fee': '#15803D',
  'UPI / Digital Payment Scam': '#D97706',
  'General Scam': '#6B6470',
}

/* ─── SVG Icon Library ───────────────────────────────────── */
const Icon = {
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  AlertTriangle: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  CheckCircle: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Search: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  BarChart: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Clock: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Info: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Globe: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  ),
  Tag: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Zap: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Lock: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  Link: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  DollarSign: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  Scale: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Smartphone: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Volume2: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
    </svg>
  ),
  AlertCircle: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  TrendingUp: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Key: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  RefreshCw: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  ),
  Copy: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  ),
  Microscope: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/>
      <path d="M3 22h18"/>
      <path d="M14 22a7 7 0 100-14h-1"/>
      <path d="M9 14H4"/>
      <path d="M9 6l-3-3 3-3 3 3"/>
      <line x1="9" y1="3" x2="9" y2="14"/>
    </svg>
  ),
  CPU: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  ChevronLeft: ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Trash2: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  ),
  XCircle: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  Activity: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  BookOpen: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
  Target: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Scan: ({ size = 28 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2"/>
      <path d="M17 3h2a2 2 0 012 2v2"/>
      <path d="M21 17v2a2 2 0 01-2 2h-2"/>
      <path d="M7 21H5a2 2 0 01-2-2v-2"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  Layers: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
}

/* ─── Threat signal metadata ─────────────────────────────── */
interface ThreatSignalInfo {
  icon: ReactNode
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

function getThreatSignalInfo(signal: string): ThreatSignalInfo {
  const map: Record<string, ThreatSignalInfo> = {
    'Uses urgency/pressure tactics': {
      icon: <Icon.Zap />, title: 'Urgency & Pressure Tactics',
      description: 'The message uses words like "immediately," "now," or "hurry" to pressure you into acting without thinking carefully.',
      severity: 'high',
    },
    'Contains monetary references': {
      icon: <Icon.DollarSign />, title: 'Monetary References',
      description: 'The message mentions specific amounts of money, common in prize scams, advance fee fraud, and investment schemes.',
      severity: 'medium',
    },
    'Requests OTP sharing': {
      icon: <Icon.Lock />, title: 'OTP / Credential Request',
      description: 'The message asks you to share an OTP or verification code. Legitimate services will never ask you to share these.',
      severity: 'high',
    },
    'Makes unrealistic guarantees': {
      icon: <Icon.Target />, title: 'Unrealistic Guarantees',
      description: 'Claims of "100% profit," "guaranteed returns," or "zero risk" are classic hallmarks of investment scams and fraud.',
      severity: 'high',
    },
    'Contains threats of legal/police action': {
      icon: <Icon.Scale />, title: 'Legal Threats & Intimidation',
      description: 'Threatening arrest or legal action via messages is a social engineering tactic. Real authorities do not demand payment this way.',
      severity: 'high',
    },
    'Contains UPI payment ID': {
      icon: <Icon.Smartphone />, title: 'UPI Payment ID Detected',
      description: 'A UPI ID was found in the message. Scammers often include UPI IDs to receive fraudulent payments directly.',
      severity: 'medium',
    },
    'Excessive use of CAPS (shouting)': {
      icon: <Icon.Volume2 />, title: 'Excessive Capitalization',
      description: 'Heavy use of ALL CAPS is a manipulation technique designed to grab attention and create a sense of urgency.',
      severity: 'low',
    },
    'Excessive exclamation marks': {
      icon: <Icon.AlertCircle />, title: 'Excessive Exclamation Marks',
      description: 'Overuse of exclamation marks is common in scam messages to create artificial excitement or urgency.',
      severity: 'low',
    },
  }
  if (map[signal]) return map[signal]
  if (signal.includes('suspicious URL')) {
    return {
      icon: <Icon.Link />, title: 'Suspicious URLs Detected',
      description: 'The message contains URLs using shorteners or suspicious domains commonly associated with phishing and scam websites.',
      severity: 'high',
    }
  }
  return {
    icon: <Icon.AlertTriangle />, title: signal,
    description: 'This pattern was identified by the rule-based analysis engine.',
    severity: 'medium',
  }
}

/* ─── Safety recommendations ─────────────────────────────── */
interface Recommendation { icon: ReactNode; title: string; description: string }

function getRecommendations(meta?: MetaInfo): Recommendation[] {
  const recs: Recommendation[] = []
  if (meta?.has_otp) recs.push({ icon: <Icon.Lock />, title: 'Never Share OTPs or Passwords', description: 'Legitimate organizations will never ask you to share OTPs, passwords, or verification codes over messages or calls.' })
  if (meta?.suspicious_urls && meta.suspicious_urls.length > 0) recs.push({ icon: <Icon.Link />, title: "Don't Click Suspicious Links", description: 'Shortened URLs (bit.ly, t.me, etc.) can mask malicious destinations. Always verify URLs before clicking.' })
  if (meta?.has_money) recs.push({ icon: <Icon.DollarSign />, title: 'Verify Before Transferring Money', description: 'Never transfer money based on a message alone. Independently verify the request through an official channel.' })
  if (meta?.has_threat) recs.push({ icon: <Icon.Scale />, title: "Agencies Don't Threaten via Messages", description: 'Legitimate authorities like CBI, police, or tax departments do not threaten arrest or demand money via phone or messages.' })
  if (meta?.has_guarantee) recs.push({ icon: <Icon.TrendingUp />, title: 'Be Skeptical of Guaranteed Returns', description: 'No legitimate investment can guarantee specific returns. Promises of "100% profit" or "zero risk" are almost always fraudulent.' })
  if (meta?.has_urgency) recs.push({ icon: <Icon.Clock />, title: 'Resist Pressure to Act Immediately', description: 'Scammers create artificial urgency. Take time to think and verify before responding to any urgent-sounding request.' })
  recs.push({ icon: <Icon.CheckCircle />, title: 'Verify Through Official Channels', description: 'Contact the organization directly using their official website or customer care number — never through links in the message.' })
  recs.push({ icon: <Icon.AlertTriangle />, title: 'Report Suspected Scams', description: 'Report scams to the Cyber Crime portal (cybercrime.gov.in) or your local police. Your report helps protect others.' })
  return recs
}

/* ─── Message highlighting ───────────────────────────────── */
function highlightMessageText(text: string, keywords: [string, number][]): ReactNode {
  const matchable = keywords.filter(([kw]) => !kw.startsWith('[tfidf]')).sort((a, b) => b[0].length - a[0].length)
  if (matchable.length === 0) return <span>{text}</span>
  type Match = { start: number; end: number; keyword: string; weight: number }
  const matches: Match[] = []
  const lowerText = text.toLowerCase()
  for (const [kw, weight] of matchable) {
    let from = 0
    while (from < lowerText.length) {
      const idx = lowerText.indexOf(kw.toLowerCase(), from)
      if (idx === -1) break
      matches.push({ start: idx, end: idx + kw.length, keyword: kw, weight })
      from = idx + kw.length
    }
  }
  matches.sort((a, b) => a.start - b.start)
  const kept: Match[] = []; let lastEnd = 0
  for (const m of matches) { if (m.start >= lastEnd) { kept.push(m); lastEnd = m.end } }
  if (kept.length === 0) return <span>{text}</span>
  const nodes: ReactNode[] = []; let pos = 0
  for (const m of kept) {
    if (m.start > pos) nodes.push(<span key={`t${pos}`}>{text.slice(pos, m.start)}</span>)
    const sev = m.weight >= 0.8 ? 'high' : m.weight >= 0.5 ? 'medium' : 'low'
    nodes.push(<mark key={`h${m.start}`} className={`xr-highlight ${sev}`} title={`"${m.keyword}" — suspicion weight: ${(m.weight * 100).toFixed(0)}%`}>{text.slice(m.start, m.end)}</mark>)
    pos = m.end
  }
  if (pos < text.length) nodes.push(<span key={`t${pos}`}>{text.slice(pos)}</span>)
  return <>{nodes}</>
}

/* ─── Helpers ────────────────────────────────────────────── */
function riskLevel(conf: number) {
  if (conf >= 0.8) return 'Critical Risk'
  if (conf >= 0.6) return 'High Risk'
  if (conf >= 0.4) return 'Moderate Risk'
  return 'Low Risk'
}
function timeAgo(ts: number): string {
  const diff = Date.now() - ts; const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`
}
function getVerdictLabel(label: string, confidence: number): string {
  if (label !== 'scam') return 'No Scam Indicators Detected'
  if (confidence >= 0.8) return 'Potential Scam'
  if (confidence >= 0.6) return 'Suspicious Content'
  return 'Potentially Suspicious'
}
function getVerdictDescription(label: string, confidence: number): string {
  if (label !== 'scam') return 'This message does not exhibit strong scam indicators. However, always exercise caution with unexpected or unsolicited messages.'
  if (confidence >= 0.8) return 'This message shows strong indicators of a scam or social engineering attempt. Multiple warning signs were identified.'
  if (confidence >= 0.6) return 'This message contains several patterns commonly associated with scams. Review the warning signs below carefully.'
  return 'Some potentially suspicious patterns were detected. The indicators are not conclusive — review the details below.'
}
function formatLang(lang?: string): string {
  if (lang === 'hi') return 'Hindi'; if (lang === 'hinglish') return 'Hinglish'; return 'English'
}

/* ═══════════════════════════════════════════════════════════
   ANALYZE PAGE
═══════════════════════════════════════════════════════════ */
function AnalyzePage({ history, onResult, onNavigate }: { history: HistoryItem[]; onResult: (item: HistoryItem) => void; onNavigate: (page: Page) => void }) {
  const [text, setText] = useState('')
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectResponse | null>(null)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [charCount, setCharCount] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ threats: true, highlights: true, recommendations: true, model: false })
  const [copied, setCopied] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true); setError(''); setResult(null); setCopied(false)
    setExpandedSections({ threats: true, highlights: true, recommendations: true, model: false })
    try {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang }) })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data: DetectResponse = await res.json()
      setResult(data)
      onResult({ ...data, text, lang, ts: Date.now() })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cannot connect to API. Is the backend running?')
    } finally { setLoading(false) }
  }

  const loadExample = (ex: string) => { setText(ex); setCharCount(ex.length); setResult(null); textareaRef.current?.focus() }
  const analyzeAnother = () => { setText(''); setCharCount(0); setResult(null); setError(''); setCopied(false); textareaRef.current?.focus() }

  const copyResults = async () => {
    if (!result) return
    const lines = ['ScamShield AI — Analysis Report', '', `Classification: ${getVerdictLabel(result.label, result.confidence)}`, `Confidence: ${(result.confidence * 100).toFixed(1)}%`, `Risk Level: ${result.label === 'scam' ? riskLevel(result.confidence) : 'Low Risk'}`, `Language: ${formatLang(result.detected_language)}`, '', 'Message:', text]
    if (result.threat_signals && result.threat_signals.length > 0) { lines.push('', 'Warning Signs Detected:'); result.threat_signals.forEach(s => lines.push(`  • ${s}`)) }
    lines.push('', '— Generated by ScamShield AI · Hybrid NLP Engine v3')
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* unavailable */ }
  }

  const scam = result?.label === 'scam'
  const sortedKeywords = result ? Object.entries(result.explanation).sort((a, b) => b[1] - a[1]).slice(0, 12) : []
  const tfidfKeywords = sortedKeywords.filter(([kw]) => kw.startsWith('[tfidf]'))
  const ruleKeywords = sortedKeywords.filter(([kw]) => !kw.startsWith('[tfidf]'))

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="hero animate-in">
        {/* Animated particle network */}
        <div className="hero-particles" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 900 260" preserveAspectRatio="xMidYMid slice" className="particles-svg">
            {/* Connection lines */}
            <line x1="80" y1="60" x2="220" y2="40" stroke="rgba(194,24,91,0.15)" strokeWidth="1" className="p-line l1" />
            <line x1="220" y1="40" x2="380" y2="90" stroke="rgba(194,24,91,0.12)" strokeWidth="1" className="p-line l2" />
            <line x1="380" y1="90" x2="520" y2="50" stroke="rgba(194,24,91,0.15)" strokeWidth="1" className="p-line l3" />
            <line x1="520" y1="50" x2="700" y2="80" stroke="rgba(194,24,91,0.12)" strokeWidth="1" className="p-line l4" />
            <line x1="700" y1="80" x2="820" y2="55" stroke="rgba(194,24,91,0.10)" strokeWidth="1" className="p-line l5" />
            <line x1="80" y1="60" x2="160" y2="180" stroke="rgba(194,24,91,0.08)" strokeWidth="1" className="p-line l6" />
            <line x1="380" y1="90" x2="300" y2="190" stroke="rgba(194,24,91,0.08)" strokeWidth="1" className="p-line l7" />
            <line x1="520" y1="50" x2="600" y2="170" stroke="rgba(194,24,91,0.10)" strokeWidth="1" className="p-line l8" />
            <line x1="700" y1="80" x2="750" y2="200" stroke="rgba(194,24,91,0.08)" strokeWidth="1" className="p-line l9" />
            {/* Nodes */}
            <circle cx="80"  cy="60"  r="3.5" fill="rgba(194,24,91,0.55)" className="p-node n1" />
            <circle cx="220" cy="40"  r="2.5" fill="rgba(231,84,128,0.45)" className="p-node n2" />
            <circle cx="380" cy="90"  r="4"   fill="rgba(194,24,91,0.60)" className="p-node n3" />
            <circle cx="520" cy="50"  r="3"   fill="rgba(231,84,128,0.50)" className="p-node n4" />
            <circle cx="700" cy="80"  r="3.5" fill="rgba(194,24,91,0.50)" className="p-node n5" />
            <circle cx="820" cy="55"  r="2.5" fill="rgba(231,84,128,0.35)" className="p-node n6" />
            <circle cx="160" cy="180" r="2.5" fill="rgba(194,24,91,0.30)" className="p-node n7" />
            <circle cx="300" cy="190" r="3"   fill="rgba(231,84,128,0.35)" className="p-node n8" />
            <circle cx="600" cy="170" r="2.5" fill="rgba(194,24,91,0.30)" className="p-node n9" />
            <circle cx="750" cy="200" r="2"   fill="rgba(231,84,128,0.25)" className="p-node n10" />
            {/* Pulse rings on major nodes */}
            <circle cx="380" cy="90" r="10" fill="none" stroke="rgba(194,24,91,0.20)" strokeWidth="1" className="p-ring r1" />
            <circle cx="520" cy="50" r="8"  fill="none" stroke="rgba(194,24,91,0.18)" strokeWidth="1" className="p-ring r2" />
            <circle cx="80"  cy="60" r="8"  fill="none" stroke="rgba(194,24,91,0.15)" strokeWidth="1" className="p-ring r3" />
          </svg>
        </div>
        {/* Radar sweep orb */}
        <div className="hero-radar" aria-hidden="true">
          <div className="radar-ring rr1" />
          <div className="radar-ring rr2" />
          <div className="radar-ring rr3" />
          <div className="radar-sweep" />
        </div>
        <div className="hero-eyebrow">NLP Framework · Hybrid Detection Engine</div>
        <h1>Detect <span className="gradient-text">Social Scams</span><br />Detect Before They Harm</h1>
        <p className="hero-desc">An explainable, multilingual framework for detecting job scams &amp; social engineering in Indian digital communication.</p>
        <div className="hero-chips">
          <div className="hero-chip"><strong>2</strong>&nbsp;Languages</div>
          <div className="hero-chip"><strong>3-Layer</strong>&nbsp;NLP Engine</div>
          <div className="hero-chip"><strong>7</strong>&nbsp;Scam Categories</div>
          <div className="hero-chip">Explainable AI</div>
        </div>
      </section>

      {/* ── Main grid ─────────────────────────────────────── */}
      <main className="main">
        <div>
          {/* ════════════════════════════════════════════════
              CREATIVE INPUT PANEL — "Scan Console"
          ════════════════════════════════════════════════ */}
          <div className={`scan-console animate-in ${isFocused ? 'focused' : ''} ${loading ? 'scanning' : ''} ${result ? (scam ? 'result-scam' : 'result-legit') : ''}`}>
            {/* Console Header bar */}
            <div className="console-header">
              <div className="console-dots">
                <span className="cdot red" /><span className="cdot yellow" /><span className="cdot green" />
              </div>
              <span className="console-title">ScamShield Scan Console</span>
              <div className="console-lang-toggle">
                {(['en', 'hi'] as const).map(l => (
                  <button key={l} className={`clang-btn ${lang === l ? 'active' : ''}`} onClick={() => { setLang(l); setResult(null) }}>
                    {l === 'en' ? 'EN' : 'HI'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan target label */}
            <div className="console-body">
              <div className="console-label-row">
                <div className="console-label">
                  <Icon.Scan size={13} />
                  <span>SCAN TARGET &nbsp;·&nbsp; {lang === 'en' ? 'English' : 'Hindi'}</span>
                </div>
                <span className={`char-count-pill ${charCount > 500 ? 'warn' : ''}`}>{charCount} chars</span>
              </div>

              {/* Animated scan line */}
              {loading && <div className="scan-line-anim" />}

              {/* The textarea */}
              <div className="console-textarea-wrap">
                <textarea
                  ref={textareaRef}
                  className="console-textarea"
                  value={text}
                  onChange={e => { setText(e.target.value); setCharCount(e.target.value.length) }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={lang === 'en'
                    ? 'Paste a suspicious message, job offer, or WhatsApp forward here…'
                    : 'यहाँ संदिग्ध संदेश, नौकरी की पेशकश या व्हाट्सएप फॉरवर्ड पेस्ट करें…'}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyze() }}
                  aria-label="Message to analyze"
                  rows={6}
                />
                {/* Watermark icon */}
                {!text && !loading && (
                  <div className="console-watermark">
                    <Icon.Scan size={52} />
                  </div>
                )}
                {/* Clear button */}
                {text && !loading && (
                  <button className="console-clear-btn" onClick={() => { setText(''); setCharCount(0); setResult(null); textareaRef.current?.focus() }} aria-label="Clear input">
                    <Icon.XCircle size={16} />
                  </button>
                )}
              </div>

              {/* Example buttons */}
              <div className="console-examples">
                <span className="console-examples-label">Try an example</span>
                <div className="console-examples-list">
                  {EXAMPLES[lang].map((ex, i) => (
                    <button key={i} className={`console-example-btn ${ex.type}`} onClick={() => loadExample(ex.text)}>
                      <span className={`ex-badge ${ex.type}`}>{ex.type === 'scam' ? 'SCAM' : 'LEGIT'}</span>
                      <span className="ex-text">{ex.text.length > 70 ? ex.text.slice(0, 70) + '…' : ex.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="console-error" role="alert">
                <Icon.AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Analyze button */}
            <div className="console-footer">
              <button className="console-analyze-btn" onClick={analyze} disabled={loading || !text.trim()} aria-label="Analyze message">
                {loading ? (
                  <><div className="spinner" /><span>Analyzing…</span></>
                ) : (
                  <>
                    <Icon.Search size={16} />
                    <span>Analyze Message</span>
                    <kbd>Ctrl+Enter</kbd>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
             EXPLAINABLE RESULTS
          ═══════════════════════════════════════════════════ */}
          {result && (
            <div className="xr-results animate-in" style={{ marginTop: 20 }}>

              {/* ── 1. Detection Summary Card ────────────── */}
              <div className="xr-summary-card">
                <div className={`xr-verdict ${scam ? 'scam' : 'legit'}`}>
                  <div className={`xr-verdict-icon ${scam ? 'scam' : 'legit'}`}>
                    {scam ? <Icon.AlertTriangle size={22} /> : <Icon.CheckCircle size={22} />}
                  </div>
                  <div className="xr-verdict-info">
                    <h3>{getVerdictLabel(result.label, result.confidence)}</h3>
                    <p>{getVerdictDescription(result.label, result.confidence)}</p>
                  </div>
                  <div className={`xr-verdict-badge ${scam ? (result.confidence >= 0.8 ? 'critical' : result.confidence >= 0.6 ? 'high' : 'moderate') : 'safe'}`}>
                    {scam ? riskLevel(result.confidence) : 'Low Risk'}
                  </div>
                </div>
                <div className="xr-stats-row">
                  <div className="xr-confidence">
                    <div className="xr-confidence-ring">
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border-subtle)" strokeWidth="7" />
                        <circle cx="44" cy="44" r="36" fill="none" stroke={scam ? 'var(--pink-primary)' : 'var(--risk-low)'} strokeWidth="7"
                          strokeDasharray={`${result.confidence * 226.2} 226.2`} strokeLinecap="round"
                          className="xr-gauge-fill" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                      </svg>
                      <span className="xr-confidence-pct">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="xr-confidence-meta">
                      <span className="xr-confidence-label">Ensemble Confidence</span>
                      <div className="xr-confidence-bar-wrap">
                        <div className={`xr-confidence-bar-fill ${scam ? '' : 'legit'}`} style={{ width: `${result.confidence * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="xr-info-chips">
                    {result.detected_language && (
                      <div className="xr-chip lang"><Icon.Globe size={12} />{formatLang(result.detected_language)}</div>
                    )}
                    {result.categories && result.categories.length > 0 && scam && result.categories.map((cat, i) => (
                      <div key={cat} className="xr-chip category animate-in" style={{ animationDelay: `${i * 80}ms`, borderColor: `${CATEGORY_COLORS[cat] ?? '#6B6470'}33`, background: `${CATEGORY_COLORS[cat] ?? '#6B6470'}0C` }}>
                        <Icon.Tag size={11} />{cat}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── 2. Why Was This Flagged? ──────────────── */}
              {scam && (
                <div className="xr-section animate-in" style={{ animationDelay: '80ms' }}>
                  <button className="xr-section-header" onClick={() => toggleSection('threats')} aria-expanded={expandedSections.threats}>
                    <h4><span className="xr-section-icon"><Icon.AlertTriangle size={15} /></span>Why Was This Flagged?{result.threat_signals && result.threat_signals.length > 0 && <span className="xr-count-badge">{result.threat_signals.length}</span>}</h4>
                    <span className={`xr-toggle-chevron ${expandedSections.threats ? 'open' : ''}`}><Icon.ChevronLeft size={16} /></span>
                  </button>
                  {expandedSections.threats && (
                    <div className="xr-section-body animate-scale">
                      {result.threat_signals && result.threat_signals.length > 0 ? (
                        <div className="xr-threats-list">
                          {result.threat_signals.map((signal, i) => {
                            const info = getThreatSignalInfo(signal)
                            return (
                              <div key={signal} className={`xr-threat-card ${info.severity} animate-in`} style={{ animationDelay: `${i * 60}ms` }}>
                                <span className="xr-threat-icon">{info.icon}</span>
                                <div className="xr-threat-body"><strong>{info.title}</strong><p>{info.description}</p></div>
                                <span className={`xr-severity-badge ${info.severity}`}>{info.severity === 'high' ? 'High' : info.severity === 'medium' ? 'Medium' : 'Low'}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="xr-no-data"><span className="xr-no-data-icon"><Icon.CPU size={18} /></span><p>The model identified this content as suspicious, but detailed evidence for individual indicators is not currently available.</p></div>
                      )}
                      <div className="xr-disclaimer"><Icon.Info size={14} />These indicators were detected by rule-based pattern analysis — they are not explanations of the ML model's internal reasoning.</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. Analyzed Message ───────────────────── */}
              <div className="xr-section animate-in" style={{ animationDelay: '160ms' }}>
                <button className="xr-section-header" onClick={() => toggleSection('highlights')} aria-expanded={expandedSections.highlights}>
                  <h4><span className="xr-section-icon"><Icon.Search size={15} /></span>Analyzed Message{ruleKeywords.length > 0 && <span className="xr-count-badge">{ruleKeywords.length} keyword{ruleKeywords.length !== 1 ? 's' : ''}</span>}</h4>
                  <span className={`xr-toggle-chevron ${expandedSections.highlights ? 'open' : ''}`}><Icon.ChevronLeft size={16} /></span>
                </button>
                {expandedSections.highlights && (
                  <div className="xr-section-body animate-scale">
                    <div className="xr-message-box">{ruleKeywords.length > 0 ? highlightMessageText(text, ruleKeywords) : <span>{text}</span>}</div>
                    {ruleKeywords.length > 0 && (
                      <div className="xr-highlight-legend">
                        <span className="xr-legend-title">Highlight Legend:</span>
                        <div className="xr-legend-items">
                          <span className="xr-legend-item"><mark className="xr-highlight high xr-legend-swatch">■</mark>High suspicion (≥80%)</span>
                          <span className="xr-legend-item"><mark className="xr-highlight medium xr-legend-swatch">■</mark>Medium (50–79%)</span>
                          <span className="xr-legend-item"><mark className="xr-highlight low xr-legend-swatch">■</mark>Low (&lt;50%)</span>
                        </div>
                      </div>
                    )}
                    {sortedKeywords.length > 0 && (
                      <div className="xr-keywords-section">
                        <h5>Keyword Triggers ({sortedKeywords.length} found)</h5>
                        <div className="xr-keywords-list">
                          {sortedKeywords.map(([kw, w], i) => (
                            <div className="xr-keyword-row" key={kw} style={{ animationDelay: `${i * 40}ms` }}>
                              <span className="xr-keyword-label" title={kw}>
                                {kw.startsWith('[tfidf]') && <span className="xr-keyword-source">TF-IDF</span>}
                                {kw.replace('[tfidf] ', '')}
                              </span>
                              <div className="xr-keyword-bar-wrap"><div className={`xr-keyword-bar-fill ${w >= 0.8 ? 'high' : w >= 0.5 ? 'medium' : 'low'}`} style={{ width: `${w * 100}%`, animationDelay: `${i * 40}ms` }} /></div>
                              <span className="xr-keyword-weight">{(w * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {sortedKeywords.length === 0 && !scam && <div className="xr-no-keywords">No suspicious keywords detected in this message.</div>}
                    {ruleKeywords.length > 0 && <div className="xr-disclaimer"><Icon.Info size={14} />Highlighted words were matched by the keyword scoring engine. They may not reflect the ML model's actual feature weighting.</div>}
                    {tfidfKeywords.length > 0 && <div className="xr-disclaimer"><Icon.CPU size={14} />Keywords tagged "TF-IDF" are features identified by the machine learning model's text vectorizer.</div>}
                  </div>
                )}
              </div>

              {/* ── 4. Safety Recommendations ────────────── */}
              {scam && (
                <div className="xr-section animate-in" style={{ animationDelay: '240ms' }}>
                  <button className="xr-section-header" onClick={() => toggleSection('recommendations')} aria-expanded={expandedSections.recommendations}>
                    <h4><span className="xr-section-icon"><Icon.Shield /></span>What Should You Do?</h4>
                    <span className={`xr-toggle-chevron ${expandedSections.recommendations ? 'open' : ''}`}><Icon.ChevronLeft size={16} /></span>
                  </button>
                  {expandedSections.recommendations && (
                    <div className="xr-section-body animate-scale">
                      <div className="xr-recommendations">
                        {getRecommendations(result.meta).map((rec, i) => (
                          <div key={typeof rec.title === 'string' ? rec.title : i} className="xr-rec-card animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                            <span className="xr-rec-icon">{rec.icon}</span>
                            <div className="xr-rec-body"><strong>{rec.title}</strong><p>{rec.description}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 5. Model Transparency ────────────────── */}
              <div className="xr-section animate-in" style={{ animationDelay: '320ms' }}>
                <button className="xr-section-header" onClick={() => toggleSection('model')} aria-expanded={expandedSections.model}>
                  <h4><span className="xr-section-icon"><Icon.Microscope size={15} /></span>How This Prediction Was Made</h4>
                  <span className={`xr-toggle-chevron ${expandedSections.model ? 'open' : ''}`}><Icon.ChevronLeft size={16} /></span>
                </button>
                {expandedSections.model && (
                  <div className="xr-section-body animate-scale">
                    <div className="xr-model-grid">
                      {[
                        ['Model', 'TF-IDF + Logistic Regression'],
                        ['Engine', 'Hybrid Ensemble v3.0'],
                        ['Prediction', result.label === 'scam' ? 'Scam' : 'Legitimate', result.label === 'scam' ? 'scam-text' : 'legit-text'],
                        ['Confidence', `${(result.confidence * 100).toFixed(2)}%`],
                        ['Language', formatLang(result.detected_language)],
                        ['Rule-Based Signals', result.threat_signals && result.threat_signals.length > 0 ? `${result.threat_signals.length} detected` : 'None detected'],
                        ['Keyword Matches', `${ruleKeywords.length > 0 ? `${ruleKeywords.length} keyword${ruleKeywords.length !== 1 ? 's' : ''}` : 'None'}${tfidfKeywords.length > 0 ? ` + ${tfidfKeywords.length} TF-IDF` : ''}`],
                        ['Threshold', '≥ 40% → Scam'],
                      ].map(([label, val, cls]) => (
                        <div className="xr-model-row" key={label}>
                          <span className="xr-model-label">{label}</span>
                          <span className={`xr-model-value ${cls ?? ''}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="xr-model-layers">
                      <h5>Ensemble Signal Layers</h5>
                      <div className="xr-layer-list">
                        {[
                          { n: 'l1', title: 'ML Classifier (TF-IDF + Logistic Regression)', sub: 'Trained on bilingual corpus · n-gram text features', w: '~35–45%' },
                          { n: 'l2', title: 'Keyword Scoring Engine', sub: 'Curated scam phrase dictionary with suspicion weights', w: '~20–30%' },
                          { n: 'l3', title: 'Structural Feature Analysis', sub: 'CAPS ratio, punctuation, digit density, monetary values', w: '~15%' },
                          { n: 'l4', title: 'Metadata & Pattern Detection', sub: 'URLs, phone numbers, UPI IDs, urgency/threat indicators', w: '~15%' },
                        ].map((l, i) => (
                          <div className="xr-layer" key={i}>
                            <div className={`xr-layer-num ${l.n}`}>{i + 1}</div>
                            <div className="xr-layer-body"><strong>{l.title}</strong><span>{l.sub}</span></div>
                            <span className="xr-layer-weight">{l.w}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="xr-model-transparency">
                      <h5>Understanding This Report</h5>
                      <div className="xr-transparency-items">
                        {[
                          { m: 'a', label: 'A', title: 'Model Prediction', desc: 'The ensemble confidence score and classification label.' },
                          { m: 'b', label: 'B', title: 'Keyword Evidence', desc: 'Words matched by the rule-based keyword engine, shown in the highlighted message.' },
                          { m: 'c', label: 'C', title: 'Rule-Based Indicators', desc: 'Warning signs detected via pattern matching (urgency, threats, URLs, etc.).' },
                          { m: 'd', label: 'D', title: 'Safety Recommendations', desc: 'General guidance based on the type of indicators found.' },
                        ].map(item => (
                          <div className="xr-transparency-item" key={item.m}>
                            <span className={`xr-t-marker ${item.m}`}>{item.label}</span>
                            <div><strong>{item.title}</strong> — {item.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="xr-model-limitations">
                      <h5>Limitations</h5>
                      <ul>
                        <li>The ML model was trained on a limited bilingual corpus and may not generalize to all scam types.</li>
                        <li>Highlighted keywords show keyword matches, not the model's internal attention or feature importance.</li>
                        <li>A "legitimate" classification does not guarantee a message is safe — always exercise caution.</li>
                        <li>The system does not currently support SHAP, LIME, or attention-based explanations.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {!scam && (
                <div className="xr-safe-notice animate-in" style={{ animationDelay: '240ms' }}>
                  <Icon.Info size={18} />
                  <p>This result does not guarantee the message is safe. Always exercise caution with unexpected or unsolicited communications, and never share sensitive information unless you have independently verified the sender.</p>
                </div>
              )}

              {/* ── 6. Action Buttons ────────────────────── */}
              <div className="xr-actions animate-in" style={{ animationDelay: '400ms' }}>
                <button className="xr-btn primary" onClick={analyzeAnother} aria-label="Analyze another message">
                  <Icon.RefreshCw size={15} />Analyze Another Message
                </button>
                <button className={`xr-btn secondary ${copied ? 'copied' : ''}`} onClick={copyResults} aria-label={copied ? 'Results copied' : 'Copy results'}>
                  {copied ? <><Icon.CheckCircle size={15} />Copied!</> : <><Icon.Copy size={15} />Copy Results</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="card">
            <div className="card-title"><div className="dot" />Session Stats</div>
            <div className="stats-grid">
              <div className="stat-card animate-in delay-1"><div className="stat-label">Analyzed</div><div className="stat-value">{history.length}</div></div>
              <div className="stat-card animate-in delay-2"><div className="stat-label">Scams Found</div><div className="stat-value danger">{history.filter(x => x.label === 'scam').length}</div></div>
              <div className="stat-card animate-in delay-3"><div className="stat-label">Legitimate</div><div className="stat-value success">{history.filter(x => x.label === 'legitimate').length}</div></div>
              <div className="stat-card animate-in delay-4"><div className="stat-label">Scam Rate</div><div className="stat-value purple">{history.length ? Math.round((history.filter(x => x.label === 'scam').length / history.length) * 100) : 0}%</div></div>
            </div>
          </div>

          <div className="card how-card animate-in delay-2">
            <h3>How It Works</h3>
            {[
              { n: 1, title: 'Text Input', sub: 'Paste any message in English or Hindi' },
              { n: 2, title: 'NLP Analysis', sub: 'TF-IDF + keyword engine scans for scam patterns' },
              { n: 3, title: 'Explainability', sub: 'See exactly which keywords triggered the alert' },
              { n: 4, title: 'Risk Score', sub: 'Ensemble confidence score from 0–100%' },
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <div className="step-text"><strong>{s.title}</strong><span>{s.sub}</span></div>
              </div>
            ))}
          </div>

          <div className="card history-mini-card animate-in delay-3">
            <h3>Recent Analyses{history.length > 0 && <span className="history-count-badge">{history.length}</span>}</h3>
            {history.length === 0 ? (
              <div className="empty-history">No analyses yet.<br />Try a message above!</div>
            ) : (
              <>
                {history.slice(0, 6).map((item, i) => (
                  <div key={item.ts} className="history-item" style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => { setText(item.text); setCharCount(item.text.length); setLang(item.lang as 'en' | 'hi'); setResult({ label: item.label, confidence: item.confidence, explanation: item.explanation, categories: item.categories, detected_language: item.detected_language, meta: item.meta, structural: item.structural, threat_signals: item.threat_signals }) }}>
                    <div className={`history-dot ${item.label === 'scam' ? 'scam' : 'legit'}`} />
                    <span className="history-text">{item.text}</span>
                    <span className="history-conf">{(item.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {history.length > 6 && <button className="view-all-btn" onClick={() => onNavigate('history')}>View all {history.length} analyses →</button>}
              </>
            )}
          </div>
        </aside>
      </main>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   HISTORY PAGE
═══════════════════════════════════════════════════════════ */
function HistoryPage({ history, onClear, onSelect }: { history: HistoryItem[]; onClear: () => void; onSelect: (item: HistoryItem) => void }) {
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const filtered = history.filter(item => filter === 'scam' ? item.label === 'scam' : filter === 'legit' ? item.label === 'legitimate' : true)
  const scamCount = history.filter(x => x.label === 'scam').length
  const legitCount = history.filter(x => x.label === 'legitimate').length

  return (
    <div className="history-page animate-in">
      <div className="history-page-header">
        <div><h2>Analysis History</h2><p>{history.length} total · {scamCount} scams · {legitCount} legitimate</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="history-filters">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({history.length})</button>
            <button className={`filter-btn ${filter === 'scam' ? 'active' : ''}`} onClick={() => setFilter('scam')}>Scams ({scamCount})</button>
            <button className={`filter-btn legit ${filter === 'legit' ? 'active' : ''}`} onClick={() => setFilter('legit')}>Legitimate ({legitCount})</button>
          </div>
          {history.length > 0 && <button className="clear-btn" onClick={onClear}><Icon.Trash2 size={13} />Clear All</button>}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="history-empty-state">
          <div className="empty-icon"><Icon.Clock size={40} /></div>
          <h3>{history.length === 0 ? 'No history yet' : 'No results for this filter'}</h3>
          <p style={{ fontSize: 14, marginTop: 6, color: 'var(--text-muted)' }}>{history.length === 0 ? 'Analyze a message from the Analyze tab to see results here.' : 'Try a different filter.'}</p>
        </div>
      ) : (
        <div className="history-full-list">
          {filtered.map((item, i) => (
            <div key={item.ts} className="history-full-item" style={{ animationDelay: `${i * 35}ms` }} onClick={() => onSelect(item)}>
              <div className={`history-full-icon ${item.label === 'scam' ? 'scam' : 'legit'}`}>
                {item.label === 'scam' ? <Icon.AlertTriangle size={18} /> : <Icon.CheckCircle size={18} />}
              </div>
              <div className="history-full-body">
                <div className="history-full-text">{item.text}</div>
                <div className="history-full-meta">
                  <span className="history-lang-badge">{item.lang.toUpperCase()}</span>
                  <span>{timeAgo(item.ts)}</span>
                  {Object.keys(item.explanation).length > 0 && <span>{Object.keys(item.explanation).length} keyword{Object.keys(item.explanation).length !== 1 ? 's' : ''} flagged</span>}
                  {item.categories && item.categories.length > 0 && item.label === 'scam' && (
                    <span className="history-categories-inline">
                      {item.categories.slice(0, 2).map(cat => (
                        <span key={cat} className="history-cat-mini" style={{ borderColor: `${CATEGORY_COLORS[cat] ?? '#6B6470'}44` }}>{cat}</span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <div className="history-full-right">
                <div className={`history-full-conf ${item.label === 'scam' ? 'scam' : 'legit'}`}>{(item.confidence * 100).toFixed(0)}%</div>
                <div className="history-full-label">{item.label === 'scam' ? riskLevel(item.confidence) : 'Safe'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD — Charts
═══════════════════════════════════════════════════════════ */
function DonutChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const r = size / 2, strokeWidth = 32, innerR = r - strokeWidth, circumference = 2 * Math.PI * innerR
  let cumulativePercent = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
      {data.map((d, i) => {
        const pct = d.value / total, dashArray = circumference * pct, dashOffset = -circumference * cumulativePercent
        cumulativePercent += pct
        return <circle key={d.label} cx={r} cy={r} r={innerR} fill="none" stroke={d.color} strokeWidth={strokeWidth} strokeDasharray={`${dashArray} ${circumference - dashArray}`} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', animation: `donut-segment-in 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms both`, filter: `drop-shadow(0 0 6px ${d.color}55)` }} />
      })}
      <text x={r} y={r - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" fontFamily="Space Grotesk">{total}</text>
      <text x={r} y={r + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">TOTAL</text>
    </svg>
  )
}

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={d.label} className="bar-chart-row" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="bar-chart-label">{d.label}</span>
          <div className="bar-chart-track"><div className="bar-chart-fill" style={{ width: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '0%', background: d.color, boxShadow: `0 0 12px ${d.color}44`, animationDelay: `${i * 60}ms` }} /></div>
          <span className="bar-chart-value">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function DashboardPage({ history }: { history: HistoryItem[] }) {
  const stats = useMemo(() => {
    const scams = history.filter(h => h.label === 'scam'), legit = history.filter(h => h.label === 'legitimate')
    const catMap: Record<string, number> = {}
    scams.forEach(h => (h.categories ?? []).forEach(cat => { catMap[cat] = (catMap[cat] ?? 0) + 1 }))
    const categoryData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label] ?? '#6B6470' }))
    const buckets = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}–${(i + 1) * 10}%`, value: 0, color: i >= 7 ? '#C2185B' : i >= 4 ? '#B45309' : '#15803D' }))
    history.forEach(h => { const idx = Math.min(Math.floor(h.confidence * 10), 9); buckets[idx].value++ })
    const timeline = [...history].slice(0, 10).reverse().map((h, i) => ({ idx: i, confidence: h.confidence, label: h.label, text: h.text.slice(0, 40), ts: h.ts }))
    const kwMap: Record<string, number> = {}
    scams.forEach(h => Object.entries(h.explanation).forEach(([kw, w]) => { kwMap[kw] = (kwMap[kw] ?? 0) + w }))
    const topKeywords = Object.entries(kwMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value: Math.round(value * 100), color: 'var(--gradient)' }))
    const avgConf = history.length > 0 ? history.reduce((s, h) => s + h.confidence, 0) / history.length : 0
    const enCount = history.filter(h => h.lang === 'en').length, hiCount = history.filter(h => h.lang === 'hi').length
    return { scamCount: scams.length, legitCount: legit.length, categoryData, buckets, timeline, topKeywords, avgConf, enCount, hiCount }
  }, [history])

  if (history.length === 0) {
    return (
      <div className="dashboard-page animate-in">
        <div className="dashboard-header"><h2>Statistics Dashboard</h2><p>Interactive analytics and visualizations of your scam analysis history</p></div>
        <div className="history-empty-state"><div className="empty-icon"><Icon.BarChart size={40} /></div><h3>No data yet</h3><p style={{ fontSize: 14, marginTop: 6, color: 'var(--text-muted)' }}>Analyze some messages first to see your statistics here.</p></div>
      </div>
    )
  }

  const maxBucket = Math.max(...stats.buckets.map(b => b.value), 1)
  const maxKeyword = Math.max(...stats.topKeywords.map(k => k.value), 1)

  return (
    <div className="dashboard-page animate-in">
      <div className="dashboard-header"><h2>Statistics Dashboard</h2><p>Interactive analytics and visualizations of your scam analysis history</p></div>

      <div className="dashboard-summary-row">
        {[
          { icon: <Icon.Search size={18} />, value: history.length, label: 'Total Analyzed', cls: '', bg: 'rgba(194,24,91,0.08)' },
          { icon: <Icon.AlertTriangle size={18} />, value: stats.scamCount, label: 'Scams Detected', cls: 'danger', bg: 'rgba(190,18,60,0.08)' },
          { icon: <Icon.CheckCircle size={18} />, value: stats.legitCount, label: 'Legitimate', cls: 'success', bg: 'rgba(21,128,61,0.08)' },
          { icon: <Icon.TrendingUp size={18} />, value: `${(stats.avgConf * 100).toFixed(0)}%`, label: 'Avg Confidence', cls: 'purple', bg: 'rgba(124,58,237,0.08)' },
        ].map((s, i) => (
          <div key={s.label} className={`dash-summary-card animate-in delay-${i + 1}`}>
            <div className="dash-summary-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div><div className={`dash-summary-value ${s.cls}`}>{s.value}</div><div className="dash-summary-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Scam Category Donut */}
        <div className="dash-card animate-in delay-1">
          <div className="dash-card-header">
            <div className="dash-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}><Icon.Tag size={16} /></div>
            <div><h3>Scam Category Distribution</h3><p>Breakdown of scam types detected across all analyses</p></div>
          </div>
          {stats.categoryData.length > 0 ? (
            <div className="donut-layout">
              <DonutChart data={stats.categoryData} size={180} />
              <div className="donut-legend">
                {stats.categoryData.map(d => (
                  <div key={d.label} className="donut-legend-item">
                    <div className="donut-legend-dot" style={{ background: d.color }} />
                    <span className="donut-legend-label">{d.label}</span>
                    <span className="donut-legend-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="dash-empty">No scams detected yet</div>}
        </div>

        {/* Confidence Histogram */}
        <div className="dash-card animate-in delay-2">
          <div className="dash-card-header">
            <div className="dash-card-icon" style={{ background: 'rgba(194,24,91,0.08)' }}><Icon.BarChart size={16} /></div>
            <div><h3>Confidence Distribution</h3><p>Histogram of confidence scores across all analyses</p></div>
          </div>
          <div className="histogram-chart">
            {stats.buckets.map((b, i) => (
              <div key={b.label} className="histogram-col" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="histogram-bar-wrap">
                  <div className="histogram-bar" style={{ height: maxBucket > 0 ? `${(b.value / maxBucket) * 100}%` : '0%', background: b.color, boxShadow: `0 0 10px ${b.color}44`, animationDelay: `${i * 50}ms` }}>
                    {b.value > 0 && <span className="histogram-bar-label">{b.value}</span>}
                  </div>
                </div>
                <span className="histogram-label">{`${i * 10}%`}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Timeline */}
        <div className="dash-card animate-in delay-3">
          <div className="dash-card-header">
            <div className="dash-card-icon" style={{ background: 'rgba(79,70,229,0.08)' }}><Icon.Activity size={16} /></div>
            <div><h3>Risk Timeline</h3><p>Confidence scores of your last {stats.timeline.length} analyses</p></div>
          </div>
          <div className="timeline-chart">
            <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="none" className="timeline-svg">
              {[0, 0.25, 0.5, 0.75, 1].map(y => <line key={y} x1="0" x2="400" y1={160 - y * 140} y2={160 - y * 140} stroke="rgba(194,24,91,0.06)" strokeDasharray="4 4" />)}
              <line x1="0" x2="400" y1={160 - 0.4 * 140} y2={160 - 0.4 * 140} stroke="rgba(194,24,91,0.3)" strokeDasharray="6 4" strokeWidth="1.5" />
              <text x="4" y={160 - 0.4 * 140 - 5} fill="rgba(194,24,91,0.5)" fontSize="9" fontWeight="600">SCAM THRESHOLD</text>
              {stats.timeline.length > 1 && (
                <path d={`M ${stats.timeline.map((p, i) => `${(i / Math.max(stats.timeline.length - 1, 1)) * 380 + 10},${160 - p.confidence * 140}`).join(' L ')} L ${380 + 10},160 L 10,160 Z`} fill="url(#timeline-gradient)" opacity="0.3" className="timeline-area" />
              )}
              {stats.timeline.length > 1 && (
                <polyline points={stats.timeline.map((p, i) => `${(i / Math.max(stats.timeline.length - 1, 1)) * 380 + 10},${160 - p.confidence * 140}`).join(' ')} fill="none" stroke="url(#line-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="timeline-line" />
              )}
              {stats.timeline.map((p, i) => (
                <g key={i}>
                  <circle cx={(i / Math.max(stats.timeline.length - 1, 1)) * 380 + 10} cy={160 - p.confidence * 140} r="5" fill={p.label === 'scam' ? 'var(--pink-primary)' : 'var(--risk-low)'} stroke="var(--bg-white)" strokeWidth="2" className="timeline-point" style={{ animationDelay: `${i * 80}ms` }} />
                  <circle cx={(i / Math.max(stats.timeline.length - 1, 1)) * 380 + 10} cy={160 - p.confidence * 140} r="10" fill={p.label === 'scam' ? 'rgba(194,24,91,0.12)' : 'rgba(21,128,61,0.10)'} />
                </g>
              ))}
              <defs>
                <linearGradient id="timeline-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--pink-primary)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--pink-primary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="line-gradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--pink-primary)" /><stop offset="50%" stopColor="var(--pink-secondary)" /><stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
            </svg>
            <div className="timeline-x-labels">
              {stats.timeline.map((p, i) => <span key={i} className="timeline-x-label" title={p.text}>#{stats.timeline.length - i}</span>)}
            </div>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="dash-card animate-in delay-4">
          <div className="dash-card-header">
            <div className="dash-card-icon" style={{ background: 'rgba(231,84,128,0.08)' }}><Icon.Key size={16} /></div>
            <div><h3>Top Scam Keywords</h3><p>Most frequently triggered keywords across all scam detections</p></div>
          </div>
          {stats.topKeywords.length > 0 ? <BarChart data={stats.topKeywords.map(k => ({ ...k, color: 'var(--pink-secondary)' }))} maxVal={maxKeyword} /> : <div className="dash-empty">No keyword data yet</div>}
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <div className="dash-card dash-card-sm animate-in delay-2">
          <h3>Language Split</h3>
          <div className="lang-split">
            <div className="lang-split-bar">
              <div className="lang-split-fill en" style={{ width: history.length > 0 ? `${(stats.enCount / history.length) * 100}%` : '0%' }} />
              <div className="lang-split-fill hi" style={{ width: history.length > 0 ? `${(stats.hiCount / history.length) * 100}%` : '0%' }} />
            </div>
            <div className="lang-split-legend">
              <span><span className="lang-dot en" />English ({stats.enCount})</span>
              <span><span className="lang-dot hi" />Hindi ({stats.hiCount})</span>
            </div>
          </div>
        </div>

        <div className="dash-card dash-card-sm animate-in delay-3">
          <h3>Detection Rate</h3>
          <div className="detection-rate">
            <div className="detection-rate-ring">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#rate-grad)" strokeWidth="8"
                  strokeDasharray={`${(stats.scamCount / Math.max(history.length, 1)) * 251.3} 251.3`}
                  strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} className="detection-ring-fill" />
                <defs><linearGradient id="rate-grad"><stop offset="0%" stopColor="var(--pink-primary)" /><stop offset="100%" stopColor="#7C3AED" /></linearGradient></defs>
              </svg>
              <span className="detection-rate-pct">{history.length > 0 ? Math.round((stats.scamCount / history.length) * 100) : 0}%</span>
            </div>
            <span className="detection-rate-label">of analyzed messages are scams</span>
          </div>
        </div>

        <div className="dash-card dash-card-sm animate-in delay-4">
          <h3>Quick Insights</h3>
          <div className="quick-insights">
            {[
              { cls: 'danger', text: 'Highest risk:', val: history.length > 0 ? `${(Math.max(...history.map(h => h.confidence)) * 100).toFixed(0)}%` : '—' },
              { cls: 'success', text: 'Lowest risk:', val: history.length > 0 ? `${(Math.min(...history.map(h => h.confidence)) * 100).toFixed(0)}%` : '—' },
              { cls: 'purple', text: 'Categories seen:', val: `${new Set(history.flatMap(h => h.categories ?? [])).size}` },
              { cls: 'blue', text: 'Keywords flagged:', val: `${new Set(history.flatMap(h => Object.keys(h.explanation))).size}` },
            ].map(s => (
              <div className="quick-insight-item" key={s.text}>
                <span className={`qi-dot ${s.cls}`} />
                <span>{s.text} <strong>{s.val}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ABOUT PAGE
═══════════════════════════════════════════════════════════ */
function AboutPage() {
  return (
    <div className="about-page animate-in">
      <h2>About ScamShield AI</h2>
      <p className="subtitle">A hybrid NLP engine combining classical machine learning, lexicon-based keyword analysis, and pattern matching to detect social scams in English and Hindi.</p>
      <div className="about-sections">
        <div className="about-card delay-1">
          <div className="about-card-header">
            <div className="about-card-icon red"><Icon.CPU size={18} /></div>
            <div><h3>3-Layer Detection Engine</h3><p>Hybrid approach combining ML, lexicon, and regex patterns</p></div>
          </div>
          <div className="layer-list">
            {[
              { n: 'l1', num: 1, title: 'TF-IDF + Logistic Regression', sub: 'Trained on 43 labelled examples (25 scam, 18 legit) · 1–3 word n-grams · max 5,000 features', w: '50%', cls: 'r' },
              { n: 'l2', num: 2, title: 'Weighted Keyword Bank (EN + HI)', sub: 'Curated dictionary of scam phrases with individual suspicion weights · sigmoid-normalized', w: '40%', cls: 'p' },
              { n: 'l3', num: 3, title: 'URL / Phone / Urgency Patterns', sub: 'Regex detection of suspicious links, phone numbers, and urgency words', w: '10%', cls: 'g' },
            ].map(l => (
              <div className="layer-item" key={l.num}>
                <div className={`layer-num ${l.n}`}>{l.num}</div>
                <div className="layer-body"><strong>{l.title}</strong><span>{l.sub}</span></div>
                <div className={`layer-weight-chip ${l.cls}`}>{l.w}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-card delay-2">
          <div className="about-card-header">
            <div className="about-card-icon purple"><Icon.Layers size={18} /></div>
            <div><h3>Ensemble Scoring Formula</h3><p>How the final confidence score is computed</p></div>
          </div>
          <div className="formula-box">
            <span className="comment"># Weighted ensemble of all three layers</span><br />
            final_score = min(<br />
            &nbsp;&nbsp;<span className="kw-red">0.50</span> × ml_confidence<br />
            &nbsp;&nbsp;+ <span className="kw-blue">0.40</span> × keyword_score<br />
            &nbsp;&nbsp;+ <span className="kw-green">0.10</span> × meta_boost,<br />
            &nbsp;&nbsp;<span className="kw-red">0.99</span><br />
            )<br /><br />
            <span className="comment"># Classification threshold</span><br />
            label = <span className="kw-red">"scam"</span> if final_score ≥ <span className="kw-red">0.40</span> else <span className="kw-green">"legitimate"</span>
          </div>
        </div>

        <div className="about-card delay-3">
          <div className="about-card-header">
            <div className="about-card-icon green"><Icon.Tag size={18} /></div>
            <div><h3>Scam Categories Detected</h3><p>7 distinct fraud patterns with dedicated keyword patterns</p></div>
          </div>
          <div className="category-grid">
            {SCAM_CATEGORIES.map(cat => (
              <div key={cat.label} className="category-item"><span>{cat.label}</span></div>
            ))}
          </div>
        </div>

        <div className="about-card delay-4">
          <div className="about-card-header">
            <div className="about-card-icon indigo"><Icon.CPU size={18} /></div>
            <div><h3>Tech Stack</h3><p>Full-stack application with Python backend and React frontend</p></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Backend</p>
            <div className="tech-stack">
              {[{ label: 'FastAPI', color: '#15803D' }, { label: 'Python 3.x', color: '#4F46E5' }, { label: 'scikit-learn', color: '#B45309' }, { label: 'TF-IDF', color: '#E75480' }, { label: 'NumPy', color: '#0891B2' }, { label: 'Transformers (planned)', color: '#7C3AED' }, { label: 'SHAP (planned)', color: '#7C3AED' }].map(t => (
                <div key={t.label} className="tech-pill"><div className="tech-dot" style={{ background: t.color }} />{t.label}</div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Frontend</p>
            <div className="tech-stack">
              {[{ label: 'React 19', color: '#0891B2' }, { label: 'TypeScript', color: '#4F46E5' }, { label: 'Vite 8', color: '#D97706' }, { label: 'Vanilla CSS', color: '#7C3AED' }].map(t => (
                <div key={t.label} className="tech-pill"><div className="tech-dot" style={{ background: t.color }} />{t.label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState<Page>('analyze')
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('scam-history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const addResult = (item: HistoryItem) => {
    setHistory(prev => { const next = [item, ...prev].slice(0, 50); localStorage.setItem('scam-history', JSON.stringify(next)); return next })
  }
  const clearHistory = () => { setHistory([]); localStorage.removeItem('scam-history') }
  const selectHistory = () => { setPage('analyze'); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50) }

  return (
    <div className="app">
      {/* ── Ambient background orbs ── */}
      <div className="app-bg" aria-hidden="true">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
        <div className="bg-grid" />
      </div>
      <header className="header">
        <button className="logo" onClick={() => setPage('analyze')} style={{ background: 'none', border: 'none' }}>
          <div className="logo-icon"><Icon.Shield /></div>
          <div><div className="logo-text">ScamShield AI</div><div className="logo-sub">Smarter Detection. Safer Connections.</div></div>
        </button>

        <nav className="nav-tabs">
          {[
            { key: 'analyze', icon: <Icon.Search size={15} />, label: 'Analyze' },
            { key: 'dashboard', icon: <Icon.BarChart size={15} />, label: 'Dashboard' },
            { key: 'history', icon: <Icon.Clock size={15} />, label: 'History' },
            { key: 'about', icon: <Icon.BookOpen size={15} />, label: 'About' },
          ].map(tab => (
            <button key={tab.key} className={`nav-tab ${page === tab.key ? 'active' : ''}`} onClick={() => setPage(tab.key as Page)}>
              <span className="tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
              {tab.key === 'history' && history.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(194,24,91,0.15)', color: 'var(--pink-primary)', borderRadius: 8, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{history.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="header-right">
          <div className="status-pill"><div className="status-dot" />API Live</div>
        </div>
      </header>

      <div className="page">
        {page === 'analyze' && <AnalyzePage history={history} onResult={addResult} onNavigate={setPage} />}
        {page === 'dashboard' && <DashboardPage history={history} />}
        {page === 'history' && <HistoryPage history={history} onClear={clearHistory} onSelect={selectHistory} />}
        {page === 'about' && <AboutPage />}
      </div>

      <footer className="footer">
        <span>ScamShield AI</span>
        <span className="footer-sep">·</span>
        <span>Explainable NLP for Indian Digital Safety</span>
        <span className="footer-sep">·</span>
        <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">API Docs</a>
        <span className="footer-sep">·</span>
        <span style={{ color: 'var(--text-muted)' }}>Hybrid Engine v3.0</span>
      </footer>
    </div>
  )
}
