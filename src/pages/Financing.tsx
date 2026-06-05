import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Upload, X } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { cars } from '../data/cars'
import { uploadDocument } from '../lib/cloudinaryService'
import { sanitizeForFirestore } from '../lib/sanitize'
import type { FinancingForm, FinancingDocument } from '../types'

function formatPrice(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

const MONTHLY_RATE = 0.008
const MONTH_OPTIONS = [12, 24, 36, 48, 60]

const emptyForm: FinancingForm = {
  firstName: '', lastName: '', email: '', phone: '',
  licenseNumber: '', income: '',
  downPayment: 20, months: 36,
  employer: '', jobTitle: '', employmentType: 'fulltime', yearsEmployed: 0, monthlyExpenses: '',
  documents: [], creditHistoryConsent: false,
}

type FormErrors = Partial<Record<keyof FinancingForm, string>>

const labelStyle: React.CSSProperties = {
  fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}

const errorStyle: React.CSSProperties = {
  fontFamily: 'Outfit', fontSize: '0.7rem',
  color: 'rgba(239,68,68,0.85)', marginTop: '0.3rem',
}

export default function Financing() {
  const [searchParams] = useSearchParams()
  const carId = searchParams.get('carId')
  const car = carId ? cars.find((c) => c.id === carId) : undefined

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FinancingForm>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [manualPrice, setManualPrice] = useState('25000')
  const [focused, setFocused] = useState<string | null>(null)
  const [applyHovered, setApplyHovered] = useState(false)
  const [submitHovered, setSubmitHovered] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File; progress: number; uploaded: boolean }>>(new Map())

  const basePrice = car ? car.price : Number(manualPrice) || 25000
  const downPaymentAmt = Math.round((form.downPayment / 100) * basePrice)
  const financed = basePrice - downPaymentAmt
  const r = MONTHLY_RATE
  const n = form.months
  const monthly = financed > 0 ? financed * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0
  const totalRepay = monthly * n + downPaymentAmt
  const totalInterest = totalRepay - basePrice
  const sliderPct = ((form.downPayment - 10) / 40) * 100

  const inputStyle = (name: string, hasErr?: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0f0f0f',
    border: `1px solid ${hasErr ? 'rgba(239,68,68,0.55)' : focused === name ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.625rem', padding: '0.75rem 1rem',
    fontFamily: 'Outfit, sans-serif', fontSize: '0.875rem', color: 'white', outline: 'none',
    transition: 'border-color 0.2s',
  })

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.licenseNumber.trim()) e.licenseNumber = 'Required'
    if (!form.income.trim()) e.income = 'Required'
    if (!form.employer.trim()) e.employer = 'Required'
    if (!form.jobTitle.trim()) e.jobTitle = 'Required'
    if (form.yearsEmployed === 0) e.yearsEmployed = 'Required'
    if (!form.monthlyExpenses.trim()) e.monthlyExpenses = 'Required'
    if (!form.creditHistoryConsent) e.creditHistoryConsent = 'You must consent to a credit check'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFilesSelected = async (files: FileList) => {
    const newFiles = Array.from(files)
    const newUploading = new Map(uploadingFiles)

    for (const file of newFiles) {
      const fileId = `${file.name}-${Date.now()}`
      newUploading.set(fileId, { file, progress: 0, uploaded: false })
    }

    setUploadingFiles(newUploading)

    for (const file of newFiles) {
      const fileId = `${file.name}-${Date.now()}`
      try {
        const url = await uploadDocument(file, 'financing-docs')

        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          updated.set(fileId, { ...updated.get(fileId)!, progress: 100, uploaded: true })
          return updated
        })

        setForm((f) => ({
          ...f,
          documents: [...f.documents, { url, type: 'other' as const, filename: file.name }],
        }))

        setTimeout(() => {
          setUploadingFiles((prev) => {
            const updated = new Map(prev)
            updated.delete(fileId)
            return updated
          })
        }, 1000)
      } catch (err) {
        console.error('File upload error:', err)
        setUploadingFiles((prev) => {
          const updated = new Map(prev)
          updated.delete(fileId)
          return updated
        })
      }
    }
  }

  const handleDocumentTypeChange = (url: string, type: FinancingDocument['type']) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.map((d) => d.url === url ? { ...d, type } : d),
    }))
  }

  const handleRemoveDocument = (url: string) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.filter((d) => d.url !== url),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const selectedCar = car || { id: 'manual', title: `Manual Entry - $${manualPrice}`, price: Number(manualPrice) || 25000 }
      const financingData = {
        carId: selectedCar.id,
        carTitle: selectedCar.title,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
        monthlyIncome: Number(form.income),
        downPayment: downPaymentAmt,
        loanTerm: form.months,
        monthlyPayment: Math.round(monthly),
        totalAmount: Math.round(financed),
        totalInterest: Math.round(totalInterest),
        employer: form.employer,
        jobTitle: form.jobTitle,
        employmentType: form.employmentType,
        yearsEmployed: Number(form.yearsEmployed),
        monthlyExpenses: Number(form.monthlyExpenses),
        documents: form.documents,
        creditHistoryConsent: form.creditHistoryConsent,
        status: 'pending',
        createdAt: serverTimestamp(),
      }
      const safeFinancingData = sanitizeForFirestore(financingData) as Record<string, unknown>
      await addDoc(collection(db, 'financing'), safeFinancingData)
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit financing application:', err)
      alert('Failed to submit application. Please try again.')
    }
  }

  /* ─── SUCCESS ─── */
  if (submitted) {
    return (
      <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem', padding: '0 1rem' }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <CheckCircle2 size={38} color="#22c55e" />
          </div>
          <h1 className="font-bebas" style={{ fontSize: '2.5rem', color: 'white', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Application Submitted!
          </h1>
          <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: 1.65 }}>
            We'll be in touch within 24 to 48 business hours to continue the process.
          </p>
          <button
            onClick={() => { setSubmitted(false); setStep(1); setForm(emptyForm) }}
            style={{
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.04em',
              padding: '0.75rem 2rem', border: '1px solid #f59e0b', color: '#f59e0b',
              borderRadius: '0.625rem', backgroundColor: 'transparent', cursor: 'pointer',
            }}
          >
            Back to Calculator
          </button>
        </div>
      </main>
    )
  }

  /* ─── MAIN ─── */
  return (
    <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <div style={{ width: '80%', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#f59e0b' }} />
            <span className="font-bebas" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#f59e0b' }}>
              FINANCE YOUR VEHICLE
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: '#f59e0b' }} />
          </div>
          <h1 className="font-bebas" style={{ fontSize: '4rem', color: 'white', lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
            Smart Financing
          </h1>
          <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
            Calculate your monthly payments and apply for financing in minutes.
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700, color: '#000',
            }}>1</div>
            <span style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white', fontWeight: 600 }}>Calculator</span>
          </div>
          {/* Connector */}
          <div style={{
            width: 80, height: 1,
            backgroundColor: step >= 2 ? '#f59e0b' : 'rgba(255,255,255,0.1)',
            margin: '0 1.25rem', transition: 'background-color 0.3s ease',
          }} />
          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: step >= 2 ? '#f59e0b' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700,
              color: step >= 2 ? '#000' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
            }}>2</div>
            <span style={{
              fontFamily: 'Outfit', fontSize: '0.875rem',
              color: step >= 2 ? 'white' : 'rgba(255,255,255,0.3)',
              fontWeight: step >= 2 ? 600 : 400, transition: 'all 0.3s ease',
            }}>Application</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STEP 1 — CALCULATOR
        ════════════════════════════════════════ */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2.5rem', alignItems: 'start' }}>

            {/* Left — Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Car card or price input */}
              {car ? (
                <div style={{
                  backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '0.875rem', padding: '1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                  <img src={car.images[0]} alt={car.title} style={{ width: 72, height: 50, objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }} />
                  <div>
                    <p className="font-bebas" style={{ fontSize: '1.1rem', color: 'white', letterSpacing: '0.05em' }}>{car.title}</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#f59e0b', fontWeight: 600 }}>{formatPrice(car.price)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>CAR PRICE (NZD)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
                    <input
                      type="number" value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="25,000"
                      onFocus={() => setFocused('price')} onBlur={() => setFocused(null)}
                      style={{ ...inputStyle('price'), paddingLeft: '2rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Down Payment slider */}
              <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.875rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>DOWN PAYMENT</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{formatPrice(downPaymentAmt)}</p>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '0.5rem', padding: '0.2rem 0.75rem',
                  }}>
                    <span className="font-bebas" style={{ fontSize: '1.75rem', color: '#f59e0b', lineHeight: 1 }}>{form.downPayment}%</span>
                  </div>
                </div>
                <input
                  type="range" min={10} max={50} step={5}
                  value={form.downPayment}
                  onChange={(e) => setForm({ ...form, downPayment: Number(e.target.value) })}
                  style={{
                    width: '100%', cursor: 'pointer', accentColor: '#f59e0b',
                    background: `linear-gradient(to right, #f59e0b ${sliderPct}%, rgba(255,255,255,0.08) ${sliderPct}%)`,
                    height: '4px', borderRadius: '2px', outline: 'none', border: 'none',
                    WebkitAppearance: 'none',
                  } as React.CSSProperties}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>10%</span>
                  <span style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>50%</span>
                </div>
              </div>

              {/* Loan Term pills */}
              <div>
                <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>LOAN TERM</p>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {MONTH_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm({ ...form, months: m })}
                      style={form.months === m ? {
                        padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#000', fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                      } : {
                        padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                        backgroundColor: '#1a1a1a', color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 400,
                        border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                      }}
                    >
                      {m} mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Results card */}
            <div style={{ position: 'sticky', top: '7rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '1.25rem', padding: '2rem',
              }}>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em', marginBottom: '0.5rem' }}>
                  ESTIMATED MONTHLY PAYMENT
                </p>
                <p className="font-bebas" style={{ fontSize: '3.5rem', color: '#f59e0b', lineHeight: 1, marginBottom: '1.75rem' }}>
                  {formatPrice(Math.round(monthly))}
                </p>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Amount Financed', value: formatPrice(financed) },
                    { label: 'Total Repayment', value: formatPrice(Math.round(totalRepay)) },
                    { label: 'Total Interest', value: formatPrice(Math.round(totalInterest)), red: true },
                  ].map(({ label, value, red }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)' }}>{label}</span>
                      <span style={{ fontFamily: 'Outfit', fontSize: '0.875rem', fontWeight: 600, color: red ? 'rgba(239,68,68,0.75)' : 'white' }}>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  onMouseEnter={() => setApplyHovered(true)}
                  onMouseLeave={() => setApplyHovered(false)}
                  style={{
                    width: '100%', height: '52px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000', fontFamily: 'Outfit', fontWeight: 700,
                    fontSize: '0.9rem', letterSpacing: '0.04em',
                    border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                    boxShadow: applyHovered ? '0 0 25px rgba(245,158,11,0.35)' : 'none',
                    transition: 'box-shadow 0.3s ease',
                  }}
                >
                  Apply for Financing →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            STEP 2 — APPLICATION FORM
        ════════════════════════════════════════ */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1.25rem', padding: '2.5rem' }}>
              <h2 className="font-bebas" style={{ fontSize: '1.75rem', color: 'white', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Complete Your Application
              </h2>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', marginBottom: '2rem' }}>
                All starred fields are required to process your application.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

                {/* First Name */}
                <div>
                  <label style={labelStyle}>FIRST NAME *</label>
                  <input required value={form.firstName} placeholder="John"
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    onFocus={() => setFocused('firstName')} onBlur={() => setFocused(null)}
                    style={inputStyle('firstName', !!errors.firstName)} />
                  {errors.firstName && <p style={errorStyle}>{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label style={labelStyle}>LAST NAME *</label>
                  <input required value={form.lastName} placeholder="Smith"
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    onFocus={() => setFocused('lastName')} onBlur={() => setFocused(null)}
                    style={inputStyle('lastName', !!errors.lastName)} />
                  {errors.lastName && <p style={errorStyle}>{errors.lastName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>EMAIL *</label>
                  <input required type="email" value={form.email} placeholder="john@example.com"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    style={inputStyle('email', !!errors.email)} />
                  {errors.email && <p style={errorStyle}>{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>PHONE *</label>
                  <input required type="tel" value={form.phone} placeholder="+64 21 123 4567"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                    style={inputStyle('phone', !!errors.phone)} />
                  {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
                </div>

                {/* Driver's Licence */}
                <div>
                  <label style={labelStyle}>DRIVER'S LICENCE NO. *</label>
                  <input required value={form.licenseNumber} placeholder="A12345678"
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    onFocus={() => setFocused('licenseNumber')} onBlur={() => setFocused(null)}
                    style={inputStyle('licenseNumber', !!errors.licenseNumber)} />
                  {errors.licenseNumber && <p style={errorStyle}>{errors.licenseNumber}</p>}
                </div>

                {/* Monthly Income */}
                <div>
                  <label style={labelStyle}>MONTHLY INCOME (NZD) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
                    <input required type="number" value={form.income} placeholder="5,000"
                      onChange={(e) => setForm({ ...form, income: e.target.value })}
                      onFocus={() => setFocused('income')} onBlur={() => setFocused(null)}
                      style={{ ...inputStyle('income', !!errors.income), paddingLeft: '2rem' }} />
                  </div>
                  {errors.income && <p style={errorStyle}>{errors.income}</p>}
                </div>

                {/* Employment Section — full width */}
                <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#f59e0b', marginBottom: '1.25rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Employment Details
                  </h3>
                </div>

                {/* Employer */}
                <div>
                  <label style={labelStyle}>EMPLOYER *</label>
                  <input required value={form.employer} placeholder="e.g., ABC Corp"
                    onChange={(e) => setForm({ ...form, employer: e.target.value })}
                    onFocus={() => setFocused('employer')} onBlur={() => setFocused(null)}
                    style={inputStyle('employer', !!errors.employer)} />
                  {errors.employer && <p style={errorStyle}>{errors.employer}</p>}
                </div>

                {/* Job Title */}
                <div>
                  <label style={labelStyle}>JOB TITLE *</label>
                  <input required value={form.jobTitle} placeholder="e.g., Manager"
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    onFocus={() => setFocused('jobTitle')} onBlur={() => setFocused(null)}
                    style={inputStyle('jobTitle', !!errors.jobTitle)} />
                  {errors.jobTitle && <p style={errorStyle}>{errors.jobTitle}</p>}
                </div>

                {/* Employment Type */}
                <div>
                  <label style={labelStyle}>EMPLOYMENT TYPE *</label>
                  <select required value={form.employmentType}
                    onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}
                    style={inputStyle('employmentType', !!errors.employmentType)}>
                    <option value="fulltime">Full-time</option>
                    <option value="parttime">Part-time</option>
                    <option value="selfemployed">Self-employed</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.employmentType && <p style={errorStyle}>{errors.employmentType}</p>}
                </div>

                {/* Years Employed */}
                <div>
                  <label style={labelStyle}>YEARS WITH CURRENT EMPLOYER *</label>
                  <input required type="number" min="0" value={form.yearsEmployed} placeholder="e.g., 3"
                    onChange={(e) => setForm({ ...form, yearsEmployed: Number(e.target.value) || 0 })}
                    onFocus={() => setFocused('yearsEmployed')} onBlur={() => setFocused(null)}
                    style={inputStyle('yearsEmployed', !!errors.yearsEmployed)} />
                  {errors.yearsEmployed && <p style={errorStyle}>{errors.yearsEmployed}</p>}
                </div>

                {/* Monthly Expenses */}
                <div>
                  <label style={labelStyle}>MONTHLY EXPENSES (NZD) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
                    <input required type="number" min="0" value={form.monthlyExpenses} placeholder="2,000"
                      onChange={(e) => setForm({ ...form, monthlyExpenses: e.target.value })}
                      onFocus={() => setFocused('monthlyExpenses')} onBlur={() => setFocused(null)}
                      style={{ ...inputStyle('monthlyExpenses', !!errors.monthlyExpenses), paddingLeft: '2rem' }} />
                  </div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>
                    Rent, food, other loans, etc.
                  </p>
                  {errors.monthlyExpenses && <p style={errorStyle}>{errors.monthlyExpenses}</p>}
                </div>

                {/* Documents Section — full width */}
                <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Supporting Documents
                  </h3>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', marginBottom: '1.25rem' }}>
                    Please upload the following documents to support your application
                  </p>

                  {/* Upload Area */}
                  <div
                    onDrop={(e) => {
                      e.preventDefault()
                      if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)'
                      e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.06)'
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'
                      e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.03)'
                    }}
                    style={{
                      border: '2px dashed rgba(245,158,11,0.3)',
                      borderRadius: '1rem',
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(245,158,11,0.03)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '180px',
                      marginBottom: '1.5rem',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)'
                      e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.06)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'
                      e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.03)'
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*, application/pdf"
                      onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                      style={{ display: 'none' }}
                      id="doc-upload"
                    />
                    <label htmlFor="doc-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                      <Upload size={40} style={{ margin: '0 auto 1rem', color: '#f59e0b' }} />
                      <p style={{ fontFamily: 'Outfit', fontSize: '1rem', color: 'white', marginBottom: '0.5rem' }}>
                        Drop files here or click to browse
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        Images and PDFs accepted
                      </p>
                    </label>
                  </div>

                  {/* Uploading Files */}
                  {uploadingFiles.size > 0 && (
                    <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                      {Array.from(uploadingFiles.entries()).map(([fileId, { file, progress }]) => (
                        <div key={fileId} style={{
                          backgroundColor: '#1a1a1a',
                          borderRadius: '0.75rem',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.06)',
                          position: 'relative',
                        }}>
                          <div style={{
                            height: '80px',
                            backgroundColor: '#0f0f0f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <div style={{
                              position: 'absolute',
                              bottom: '0',
                              left: '0',
                              right: '0',
                              height: '3px',
                              backgroundColor: '#333333',
                            }}>
                              <div style={{
                                height: '100%',
                                backgroundColor: '#f59e0b',
                                width: `${progress}%`,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                            <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', padding: '0.5rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded Documents */}
                  {form.documents.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
                        {form.documents.length} document(s) uploaded
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {form.documents.map((doc) => (
                          <div key={doc.url} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#1a1a1a', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.filename}
                            </p>
                            <select
                              value={doc.type}
                              onChange={(e) => handleDocumentTypeChange(doc.url, e.target.value as FinancingDocument['type'])}
                              style={{
                                padding: '0.5rem', borderRadius: '0.5rem',
                                backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white', fontFamily: 'Outfit', fontSize: '0.75rem',
                              }}
                            >
                              <option value="passport_license">Passport/License</option>
                              <option value="visa_residency">Visa/Residency</option>
                              <option value="proof_of_address">Proof of Address</option>
                              <option value="payslip">Payslip</option>
                              <option value="bank_statement">Bank Statement</option>
                              <option value="other">Other</option>
                            </select>
                            <button
                              onClick={() => handleRemoveDocument(doc.url)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '0.5rem',
                                backgroundColor: 'rgba(239,68,68,0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Credit Consent — full width */}
                <div style={{ gridColumn: '1 / -1', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      required
                      type="checkbox"
                      checked={form.creditHistoryConsent}
                      onChange={(e) => setForm({ ...form, creditHistoryConsent: e.target.checked })}
                      style={{ marginTop: '0.35rem', cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white', marginBottom: '0.3rem' }}>
                        I consent to a credit history check being performed *
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        By checking this box you agree to allow AutoMarket to perform a credit check as part of your financing application
                      </p>
                    </div>
                  </label>
                  {errors.creditHistoryConsent && <p style={errorStyle}>{errors.creditHistoryConsent}</p>}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button
                  type="button" onClick={() => setStep(1)}
                  style={{
                    flex: 1, height: '52px', backgroundColor: 'transparent',
                    border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'Outfit', fontSize: '0.875rem', borderRadius: '0.75rem', cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  onMouseEnter={() => setSubmitHovered(true)}
                  onMouseLeave={() => setSubmitHovered(false)}
                  style={{
                    flex: 2, height: '52px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000', fontFamily: 'Outfit', fontWeight: 700,
                    fontSize: '0.9rem', letterSpacing: '0.04em',
                    border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                    boxShadow: submitHovered ? '0 0 25px rgba(245,158,11,0.35)' : 'none',
                    transition: 'box-shadow 0.3s ease',
                  }}
                >
                  Submit Application →
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
