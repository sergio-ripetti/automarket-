import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { getCarById } from '../lib/carsService'
import { uploadDocument } from '../lib/cloudinaryService'
import { calculateFinancingSummary } from '../lib/financingCalculations'
import { validateFinancingForm, isFinancingFormValid } from '../lib/financingValidation'
import { submitFinancingApplication } from '../lib/financingService'
import FinancingCalculator from '../components/financing/FinancingCalculator'
import FinancingApplicationForm from '../components/financing/FinancingApplicationForm'
import type { Car, FinancingForm, FinancingDocument } from '../types'

const emptyForm: FinancingForm = {
  firstName: '', lastName: '', email: '', phone: '',
  licenseNumber: '', income: '',
  downPayment: 20, months: 36,
  employer: '', jobTitle: '', employmentType: 'fulltime', yearsEmployed: 0, monthlyExpenses: '',
  documents: [], creditHistoryConsent: false,
}

type FormErrors = Partial<Record<keyof FinancingForm, string>>

// Two-step financing page: step 1 is a loan calculator (down payment, term, monthly payment), step 2 is a full application form - uploads supporting documents to Cloudinary and saves the completed application to Firestore
export default function Financing() {
  const [searchParams] = useSearchParams()
  const carId = searchParams.get('carId')
  const [car, setCar] = useState<Car | undefined>(undefined)

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FinancingForm>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [manualPrice, setManualPrice] = useState('25000')
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File; progress: number; uploaded: boolean }>>(new Map())

  // Fetch car data from Firestore if carId is provided
  useEffect(() => {
    if (!carId) {
      return
    }
    const fetchCar = async () => {
      try {
        const carData = await getCarById(carId)
        setCar(carData ?? undefined)
      } catch (err) {
        console.error('Failed to load car:', err)
        setCar(undefined)
      }
    }
    fetchCar()
  }, [carId])

  const financing = calculateFinancingSummary(
    car?.price,
    manualPrice,
    form.downPayment,
    form.months,
  )

  // Validates all required application fields using the validation module
  const validate = (): boolean => {
    const formErrors = validateFinancingForm(form)
    setErrors(formErrors)
    return isFinancingFormValid(formErrors)
  }

  // Updates a single form field using functional state update
  const handleFieldChange = <K extends keyof FinancingForm>(
    field: K,
    value: FinancingForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // Handles supporting document selection/drop - uploads each selected file to Cloudinary, tracks per-file upload progress in state, and appends the resulting URLs to the financing form's documents list
  const handleFilesSelected = async (files: FileList) => {
    const newFiles = Array.from(files).filter((file): file is File => file instanceof File)
    const newUploading = new Map(uploadingFiles)

    // Generate each file's id once and reuse it across both loops below - computing
    // Date.now() separately per loop produced mismatched keys and orphaned Map entries.
    const fileEntries = newFiles.map((file) => ({ file, fileId: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}` }))

    for (const { file, fileId } of fileEntries) {
      newUploading.set(fileId, { file, progress: 0, uploaded: false })
    }

    setUploadingFiles(newUploading)

    for (const { file, fileId } of fileEntries) {
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

  // Updates the document-type classification (e.g. passport, payslip) for an already-uploaded document, matched by its URL
  const handleDocumentTypeChange = (url: string, type: FinancingDocument['type']) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.map((d) => d.url === url ? { ...d, type } : d),
    }))
  }

  // Removes an uploaded document from the financing form's documents list by URL
  const handleRemoveDocument = (url: string) => {
    setForm((f) => ({
      ...f,
      documents: f.documents.filter((d) => d.url !== url),
    }))
  }

  // Handles the financing application form submission - validates input, constructs payload, and submits via backend API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const selectedCar = car || { id: 'manual', title: `Manual Entry - $${manualPrice}`, price: Number(manualPrice) || 25000 }
      const payload = {
        carId: selectedCar.id,
        carTitle: selectedCar.title,
        carPrice: selectedCar.price,
        manualPrice,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
        income: form.income,
        monthlyExpenses: form.monthlyExpenses,
        downPayment: form.downPayment,
        months: form.months,
        employer: form.employer,
        jobTitle: form.jobTitle,
        employmentType: form.employmentType,
        yearsEmployed: form.yearsEmployed,
        documents: form.documents,
        creditHistoryConsent: form.creditHistoryConsent,
      }
      const result = await submitFinancingApplication(payload)
      if (result.success) {
        setSubmitted(true)
      } else {
        alert(result.error || 'Failed to submit application. Please try again.')
      }
    } catch (err) {
      console.error('Failed to submit financing application:', err)
      alert('Failed to submit application. Please try again.')
    }
  }

  /* ─── SUCCESS ─── */
  if (submitted) {
    return (
      <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#F2F2F0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem', padding: '0 1rem' }}>
          <div style={{
            width: '5rem', height: '5rem', borderRadius: '50%',
            backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <CheckCircle2 size={38} color="#22c55e" />
          </div>
          <h1 className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Application Submitted!
          </h1>
          <p style={{ fontFamily: 'Outfit', color: '#4A4A4A', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: 1.65 }}>
            We'll be in touch within 24 to 48 business hours to continue the process.
          </p>
          <button
            onClick={() => { setSubmitted(false); setStep(1); setForm(emptyForm) }}
            style={{
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.04em',
              padding: '0.75rem 2rem', border: '1px solid #1A1A1A', color: '#1A1A1A',
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
    <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#F2F2F0', minHeight: '100vh' }}>
      <div style={{ width: '80%', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#E0E0DC' }} />
            <span className="font-bebas" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#767676' }}>
              FINANCE YOUR VEHICLE
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: '#E0E0DC' }} />
          </div>
          <h1 className="font-bebas" style={{color: "#1A1A1A", lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
            Smart Financing
          </h1>
          <p style={{ fontFamily: 'Outfit', color: '#4A4A4A', fontSize: '1rem' }}>
            Calculate your monthly payments and apply for financing in minutes.
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: '#C4FF00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700, color: '#000',
            }}>1</div>
            <span style={{color: "#0D1B2A", fontWeight: 600 }}>Calculator</span>
          </div>
          {/* Connector */}
          <div style={{
            width: 80, height: 1,
            backgroundColor: step >= 2 ? '#C4FF00' : '#E0E0DC',
            margin: '0 1.25rem', transition: 'background-color 0.3s ease',
          }} />
          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              backgroundColor: step >= 2 ? '#C4FF00' : '#767676',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 700,
              color: step >= 2 ? '#000' : '#FFFFFF',
              transition: 'all 0.3s ease',
            }}>2</div>
            <span style={{
              fontFamily: 'Outfit', fontSize: '0.875rem',
              color: step >= 2 ? '#0D1B2A' : '#767676',
              fontWeight: 600, transition: 'all 0.3s ease',
            }}>Application</span>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STEP 1 — CALCULATOR
        ════════════════════════════════════════ */}
        {step === 1 && (
          <FinancingCalculator
            car={car}
            manualPrice={manualPrice}
            downPaymentPercent={form.downPayment}
            loanTermMonths={form.months}
            calculation={financing}
            onManualPriceChange={setManualPrice}
            onDownPaymentChange={(value) => setForm((current) => ({ ...current, downPayment: value }))}
            onLoanTermChange={(months) => setForm((current) => ({ ...current, months }))}
            onContinue={() => setStep(2)}
          />
        )}

        {/* ════════════════════════════════════════
            STEP 2 — APPLICATION FORM
        ════════════════════════════════════════ */}
        {step === 2 && (
          <FinancingApplicationForm
            form={form}
            errors={errors}
            uploadingFiles={uploadingFiles}
            onFieldChange={handleFieldChange}
            onFilesSelected={handleFilesSelected}
            onDocumentTypeChange={handleDocumentTypeChange}
            onRemoveDocument={handleRemoveDocument}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </main>
  )
}
