import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { getSaleById, generatePaymentSchedule, type Sale, type PaymentRecord, type UploadedDocument } from '../../lib/salesService'
import { updateSale, deleteCloudinaryFile, type AdminSalePayload } from '../../lib/adminSalesService'
import { uploadSalesDocument } from '../../lib/cloudinaryService'
import { showToast } from '../../lib/toast'
import { sanitizeDigits } from '../../lib/numericInput'
import { isValidNZLicence, normalizeLicenceInput } from '../../lib/financingValidation'
import { useFileAvailability } from '../../hooks/useFileAvailability'
import { downloadSaleDocument, SaleDocumentDownloadError } from '../../lib/downloadSaleDocument'
import AdminInput from '../../components/admin/AdminInput'
import AdminTextarea from '../../components/admin/AdminTextarea'
import AdminButton from '../../components/admin/AdminButton'

// Same phone-formatting behavior used in BuyerInformationStep.tsx (Record New Sale) - keeps
// digits and common formatting characters so Edit Sale enforces the same input shape as Create.
function formatPhoneInput(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, '')
}

// Formats a numeric price as NZD currency
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

type PaymentType = 'cash' | 'financing' | 'mixed'

interface EditForm {
  buyerName: string
  buyerIdNumber: string
  buyerLicense: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string
  saleDate: string
  paymentType: PaymentType
  salePrice: number
  downPayment: number
  loanTerm: number
  ffEstablishment: number
  ffPpsr: number
  ffMonthlyAccount: number
  ffDealerOrigination: number
  notes: string
  uploadingFiles: Map<string, { file: File; progress: number; uploaded: boolean }>
  uploadedDocuments: UploadedDocument[]
}

// Admin page for editing an existing sale - loads sale data from Firestore, allows correcting buyer
// info, payment type/terms (cash/financing/mixed), and document uploads to Cloudinary
export default function AdminEditSale() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Tracks which document URLs currently have a Cloudinary deletion in flight, so the Remove
  // button can be disabled per-item and repeated clicks can't fire overlapping delete requests.
  const [deletingFileUrls, setDeletingFileUrls] = useState<Set<string>>(new Set())
  // URLs already persisted to this sale in Firestore at page load - only these can be routed
  // through the protected server download proxy (which resolves attachments by matching the
  // sale's own stored record). Newly added, not-yet-saved uploads fall back to a direct link
  // until the sale is saved and the page is reloaded.
  const [savedDocumentUrls, setSavedDocumentUrls] = useState<Set<string>>(new Set())
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null)
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<EditForm>({
    buyerName: '', buyerIdNumber: '', buyerLicense: '', buyerEmail: '', buyerPhone: '', buyerAddress: '',
    saleDate: '', paymentType: 'cash', salePrice: 0, downPayment: 0, loanTerm: 24,
    ffEstablishment: 0, ffPpsr: 0, ffMonthlyAccount: 0, ffDealerOrigination: 0, notes: '',
    uploadingFiles: new Map(), uploadedDocuments: [],
  })

  const licenceInvalid = form.buyerLicense.trim().length > 0 && !isValidNZLicence(form.buyerLicense.trim().toUpperCase())
  const pdfUrls = form.uploadedDocuments.filter((doc) => /\.pdf($|\?)/i.test(doc.url)).map((doc) => doc.url)
  const fileAvailability = useFileAvailability(pdfUrls)
  const emailInvalid = form.buyerEmail.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail.trim())

  const monthlyRate = 0.008
  // Mirrors the calculation used in Record New Sale (AdminNewSale.tsx) so switching payment type
  // here produces the same figures as if the sale had been created that way from the start.
  const calc = useMemo(() => {
    if (form.paymentType === 'cash') {
      return { monthlyPayment: 0, totalPayment: form.salePrice, totalInterest: 0, financedAmount: 0 }
    }
    const financed = form.paymentType === 'mixed' ? form.salePrice - form.downPayment : form.salePrice
    const rate = monthlyRate
    const months = form.loanTerm || 1
    const monthlyPayment = (financed * (rate * (1 + rate) ** months)) / ((1 + rate) ** months - 1)
    const totalPayment = monthlyPayment * months + form.downPayment
    const totalInterest = totalPayment - form.salePrice
    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment,
      totalInterest: Math.round(totalInterest * 100) / 100,
      financedAmount: financed,
    }
  }, [form.paymentType, form.salePrice, form.downPayment, form.loanTerm])

  const financingFeesTotal = form.paymentType === 'cash'
    ? 0
    : form.ffEstablishment + form.ffPpsr + form.ffMonthlyAccount + form.ffDealerOrigination

  // Loads the sale to edit from Firestore by id and populates the form
  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await getSaleById(id)
        if (data) {
          setSale(data)
          setForm({
            buyerName: data.buyer.name,
            buyerIdNumber: data.buyer.idNumber,
            buyerLicense: data.buyer.licenseNumber,
            buyerEmail: data.buyer.email,
            buyerPhone: data.buyer.phone,
            buyerAddress: data.buyer.address,
            saleDate: data.saleDate,
            paymentType: data.paymentPlan.type,
            salePrice: data.paymentPlan.salePrice,
            downPayment: data.paymentPlan.downPayment,
            loanTerm: data.paymentPlan.termMonths || 24,
            ffEstablishment: data.financingFees?.establishmentFee || 0,
            ffPpsr: data.financingFees?.ppsr || 0,
            ffMonthlyAccount: data.financingFees?.monthlyAccountFee || 0,
            ffDealerOrigination: data.financingFees?.dealerOriginationFee || 0,
            notes: data.notes,
            uploadingFiles: new Map(),
            uploadedDocuments: (Array.isArray(data.documents?.uploadedDocuments) ? data.documents.uploadedDocuments : [])
              .map((d) => (typeof d === 'string' ? { url: d, publicId: '', resourceType: '' } : d)),
          })
          const persistedUrls = (Array.isArray(data.documents?.uploadedDocuments) ? data.documents.uploadedDocuments : [])
            .map((d) => (typeof d === 'string' ? d : d.url))
          setSavedDocumentUrls(new Set(persistedUrls))
        }
      } catch (err) {
        console.error(err)
        showToast('Failed to load sale', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Uploads selected files (images or PDFs) to Cloudinary and tracks per-file progress in form state
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  const MAX_FILES = 10

  const handleFilesSelected = async (files: FileList) => {
    const candidates = Array.from(files)
    const existingCount = form.uploadedDocuments.length + form.uploadingFiles.size
    const slotsLeft = Math.max(0, MAX_FILES - existingCount)

    if (candidates.length > slotsLeft) {
      showToast(`You can upload up to ${MAX_FILES} files total`, 'error')
    }

    const newFiles: File[] = []
    for (const file of candidates) {
      if (newFiles.length >= slotsLeft) break
      if (file.size === 0) {
        showToast(`${file.name} is empty and was skipped`, 'error')
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name} exceeds the 10MB limit`, 'error')
        continue
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        showToast(`${file.name} is not a supported file type (JPEG, PNG, WebP, PDF only)`, 'error')
        continue
      }
      newFiles.push(file)
    }

    if (newFiles.length === 0) return

    const fileIds = newFiles.map((file) => `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const newUploading = new Map(form.uploadingFiles)

    newFiles.forEach((file, i) => {
      newUploading.set(fileIds[i], { file, progress: 0, uploaded: false })
    })

    setForm((f) => ({ ...f, uploadingFiles: newUploading }))

    // Upload each file immediately
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const fileId = fileIds[i]
      try {
        const uploaded = await uploadSalesDocument(file, 'sales')

        setForm((f) => {
          const updated = new Map(f.uploadingFiles)
          updated.set(fileId, { ...updated.get(fileId)!, progress: 100, uploaded: true })
          return {
            ...f,
            uploadingFiles: updated,
            uploadedDocuments: [
              ...f.uploadedDocuments,
              { url: uploaded.url, publicId: uploaded.publicId, resourceType: uploaded.resourceType, filename: file.name, mimeType: file.type },
            ],
          }
        })

        // Remove from uploading list after 1 second
        setTimeout(() => {
          setForm((f) => {
            const updated = new Map(f.uploadingFiles)
            updated.delete(fileId)
            return { ...f, uploadingFiles: updated }
          })
        }, 1000)
      } catch (err) {
        console.error('File upload error:', err)
        showToast(err instanceof Error ? err.message : 'Failed to upload file', 'error')
        setForm((f) => {
          const updated = new Map(f.uploadingFiles)
          updated.delete(fileId)
          return { ...f, uploadingFiles: updated }
        })
      }
    }
  }

  // Removes an already-uploaded document/image. Cloudinary deletion is confirmed BEFORE the
  // reference is removed from form state (and therefore before it can be excluded from the
  // saved Sale payload) - this prevents the exact defect a live manual test confirmed: the app
  // previously stripped the reference from state immediately, so even a failed Cloudinary
  // deletion still ended up removing the reference on save, leaving an orphaned asset in
  // Cloudinary with no way to find or retry it. Legacy string-only entries have no publicId, so
  // Cloudinary can never be deleted automatically for them - the user is asked to confirm that
  // explicitly and told to remove the asset from Cloudinary manually.
  const handleRemoveFile = async (url: string) => {
    if (deletingFileUrls.has(url)) return // already in flight - ignore repeated clicks
    const doc = form.uploadedDocuments.find((d) => d.url === url)
    if (!doc) return

    if (!doc.publicId) {
      const confirmed = window.confirm(
        `"${doc.filename || url}" was uploaded before Cloudinary metadata tracking was added, so it cannot be automatically deleted from Cloudinary. ` +
        `This will only remove it from the sale record - you must delete the file from Cloudinary manually. Continue?`
      )
      if (!confirmed) return
      setForm((f) => ({ ...f, uploadedDocuments: f.uploadedDocuments.filter((d) => d.url !== url) }))
      return
    }

    setDeletingFileUrls((prev) => new Set(prev).add(url))
    try {
      const result = await deleteCloudinaryFile(doc.publicId, doc.resourceType)
      if (!result.success) {
        showToast(result.error || 'Failed to delete file from Cloudinary - the file was kept so you can retry', 'error')
        return
      }
      setForm((f) => ({ ...f, uploadedDocuments: f.uploadedDocuments.filter((d) => d.url !== url) }))
    } finally {
      setDeletingFileUrls((prev) => {
        const next = new Set(prev)
        next.delete(url)
        return next
      })
    }
  }

  // Forces a real download for an already-saved attachment via the protected backend proxy.
  // Not-yet-saved uploads (added this session, not in savedDocumentUrls) aren't resolvable by
  // the proxy yet, so they keep using the plain link until the sale is saved and reloaded.
  const handleDownloadFile = async (url: string, filename: string) => {
    if (!id || downloadingUrl !== null) return
    setDownloadErrors((prev) => {
      const next = { ...prev }
      delete next[url]
      return next
    })
    setDownloadingUrl(url)
    try {
      await downloadSaleDocument(id, url, filename)
    } catch (err) {
      const message = err instanceof SaleDocumentDownloadError ? err.message : 'Download failed. Please try again.'
      setDownloadErrors((prev) => ({ ...prev, [url]: message }))
    } finally {
      setDownloadingUrl(null)
    }
  }

  // Sanitizes and saves the edited sale (buyer info, payment type/terms, documents) via backend.
  // If payment type/amounts/term changed and no payment has been marked paid yet, the payment
  // schedule is regenerated to match; if some payments are already paid, the existing schedule is
  // preserved (to protect payment history) and only the other fields are updated.
  const handleSave = async () => {
    if (!id || !sale) return
    if (licenceInvalid) {
      showToast('Invalid NZ licence format (e.g., AB12345)', 'error')
      return
    }
    if (emailInvalid) {
      showToast('Invalid email address', 'error')
      return
    }
    setSaving(true)
    try {
      const scheduleInputsChanged =
        form.paymentType !== sale.paymentPlan.type ||
        form.salePrice !== sale.paymentPlan.salePrice ||
        form.downPayment !== sale.paymentPlan.downPayment ||
        form.loanTerm !== sale.paymentPlan.termMonths

      const hasPaidPayments = sale.payments.some((p) => p.status === 'paid')

      let payments: PaymentRecord[] = sale.payments
      let status = sale.status

      if (form.paymentType === 'cash') {
        payments = []
        if (sale.status !== 'cancelled') status = 'completed'
      } else if (scheduleInputsChanged) {
        if (hasPaidPayments) {
          showToast('Some payments are already marked paid - payment schedule was kept as-is; only totals were updated', 'success')
        } else {
          payments = generatePaymentSchedule(calc.financedAmount, form.loanTerm, monthlyRate * 100, sale.paymentPlan.firstPaymentDate)
          if (sale.status !== 'cancelled') status = 'active'
        }
      }

      const updatePayload: Partial<AdminSalePayload> = {
        buyer: {
          name: form.buyerName.trim(),
          idNumber: form.buyerIdNumber.trim(),
          email: form.buyerEmail.trim(),
          phone: form.buyerPhone.trim(),
          address: form.buyerAddress.trim(),
          licenseNumber: normalizeLicenceInput(form.buyerLicense),
        },
        saleDate: form.saleDate,
        notes: form.notes,
        paymentPlan: {
          type: form.paymentType,
          salePrice: form.salePrice,
          downPayment: form.paymentType === 'cash' ? 0 : form.downPayment,
          financedAmount: calc.financedAmount,
          monthlyRate: monthlyRate * 100,
          termMonths: form.paymentType === 'cash' ? 0 : form.loanTerm,
          monthlyPayment: calc.monthlyPayment,
          totalPayment: calc.totalPayment,
          totalInterest: calc.totalInterest,
          firstPaymentDate: sale.paymentPlan.firstPaymentDate,
        },
        financingFees: form.paymentType === 'cash' ? undefined : {
          establishmentFee: form.ffEstablishment,
          ppsr: form.ffPpsr,
          monthlyAccountFee: form.ffMonthlyAccount,
          dealerOriginationFee: form.ffDealerOrigination,
          total: financingFeesTotal,
        },
        payments,
        status,
        documents: { uploadedDocuments: form.uploadedDocuments },
      }
      const result = await updateSale(id, updatePayload)
      if (!result.success) {
        showToast(result.error || 'Failed to update sale', 'error')
        return
      }
      showToast('Sale updated successfully', 'success')
      navigate(`/admin/sales/${id}`)
    } catch (err) {
      console.error(err)
      showToast('Failed to update sale', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ fontFamily: 'Outfit', color: '#767676' }}>Loading...</p>
      </div>
    )
  }

  if (!sale) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontFamily: 'Outfit', color: '#767676', marginBottom: '1rem' }}>Sale not found</p>
        <button onClick={() => navigate('/admin/sales')} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem',
          background: '#1A1A1A', color: "#FFFFFF",
          fontFamily: 'Outfit', fontSize: '0.85rem', cursor: 'pointer', border: 'none',
        }}>Back to Sales</button>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .admin-edit-sale-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(1rem, 3vw, 2rem);
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 1024px) {
          .admin-edit-sale-grid {
            grid-template-columns: 60% 1fr;
          }
        }
        .admin-edit-sale-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(0.75rem, 2vw, 1rem);
        }
        @media (min-width: 640px) {
          .admin-edit-sale-grid-2col {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
      <button
        onClick={() => navigate(`/admin/sales/${id}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '0.625rem',
          backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
          color: '#767676', fontFamily: 'Outfit', fontSize: '0.875rem',
          cursor: 'pointer', marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} />
        Back to Sale
      </button>

      <h1 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '2rem' }}>
        Edit Sale - {sale.buyer.name}
      </h1>

      <div className="admin-edit-sale-grid">
        <div>
          {/* Buyer Information */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#1A1A1A', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
              Buyer Information
            </h3>
            <div className="admin-edit-sale-grid-2col">
              <AdminInput
                label="Full Name"
                type="text"
                maxLength={80}
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
              />
              <AdminInput
                label="ID Number"
                type="text"
                maxLength={20}
                value={form.buyerIdNumber}
                onChange={(e) => setForm((f) => ({ ...f, buyerIdNumber: e.target.value }))}
              />
              <AdminInput
                label="Email"
                type="email"
                maxLength={100}
                value={form.buyerEmail}
                onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
              />
              <AdminInput
                label="Phone"
                type="tel"
                maxLength={20}
                value={form.buyerPhone}
                onChange={(e) => setForm((f) => ({ ...f, buyerPhone: formatPhoneInput(e.target.value) }))}
              />
              <AdminInput
                label="License Number"
                type="text"
                maxLength={20}
                error={licenceInvalid ? 'Invalid NZ licence format (e.g., AB12345)' : undefined}
                value={form.buyerLicense}
                onChange={(e) => setForm((f) => ({ ...f, buyerLicense: e.target.value.toUpperCase() }))}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <AdminInput
                  label="Address"
                  type="text"
                  maxLength={100}
                  value={form.buyerAddress}
                  onChange={(e) => setForm((f) => ({ ...f, buyerAddress: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)',
          }}>
            <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#1A1A1A', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
              Payment Information
            </h3>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#767676', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem',
              }}>
                Payment Type
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['cash', 'financing', 'mixed'] as PaymentType[]).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    aria-pressed={form.paymentType === pt}
                    onClick={() => setForm((f) => ({ ...f, paymentType: pt }))}
                    style={{
                      padding: '0.5rem 1.125rem',
                      borderRadius: '0.5rem',
                      border: form.paymentType === pt ? '1px solid #1A1A1A' : '1px solid #E0E0DC',
                      backgroundColor: form.paymentType === pt ? '#1A1A1A' : '#F2F2F0',
                      color: form.paymentType === pt ? '#FFFFFF' : '#4A4A4A',
                      fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: form.paymentType === pt ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {pt === 'cash' ? 'Cash' : pt === 'financing' ? 'Financing' : 'Mixed'}
                  </button>
                ))}
              </div>
            </div>
            <div className="admin-edit-sale-grid-2col">
              <AdminInput
                label="Sale Date"
                type="date"
                value={form.saleDate}
                onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
              />
              <AdminInput
                label="Sale Price (NZD)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                value={form.salePrice === 0 ? '' : String(form.salePrice)}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: Number(sanitizeDigits(e.target.value, 7)) || 0 }))}
              />
              {form.paymentType === 'mixed' && (
                <AdminInput
                  label="Down Payment (NZD)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={form.downPayment === 0 ? '' : String(form.downPayment)}
                  onChange={(e) => setForm((f) => ({ ...f, downPayment: Number(sanitizeDigits(e.target.value, 7)) || 0 }))}
                />
              )}
              {form.paymentType !== 'cash' && (
                <AdminInput
                  label="Loan Term (months)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={form.loanTerm === 0 ? '' : String(form.loanTerm)}
                  onChange={(e) => setForm((f) => ({ ...f, loanTerm: Number(sanitizeDigits(e.target.value, 3)) || 0 }))}
                />
              )}
            </div>

            {form.paymentType !== 'cash' && (
              <div style={{ marginTop: '1.25rem' }}>
                <h4 style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  Financing Fees (NZD)
                </h4>
                <div className="admin-edit-sale-grid-2col">
                  <AdminInput
                    label="Establishment Fee"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    value={form.ffEstablishment === 0 ? '' : String(form.ffEstablishment)}
                    onChange={(e) => setForm((f) => ({ ...f, ffEstablishment: Number(sanitizeDigits(e.target.value, 5)) || 0 }))}
                  />
                  <AdminInput
                    label="PPSR Fee"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={form.ffPpsr === 0 ? '' : String(form.ffPpsr)}
                    onChange={(e) => setForm((f) => ({ ...f, ffPpsr: Number(sanitizeDigits(e.target.value, 4)) || 0 }))}
                  />
                  <AdminInput
                    label="Monthly Account Fee"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={form.ffMonthlyAccount === 0 ? '' : String(form.ffMonthlyAccount)}
                    onChange={(e) => setForm((f) => ({ ...f, ffMonthlyAccount: Number(sanitizeDigits(e.target.value, 4)) || 0 }))}
                  />
                  <AdminInput
                    label="Dealer Origination Fee"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    value={form.ffDealerOrigination === 0 ? '' : String(form.ffDealerOrigination)}
                    onChange={(e) => setForm((f) => ({ ...f, ffDealerOrigination: Number(sanitizeDigits(e.target.value, 5)) || 0 }))}
                  />
                </div>
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <AdminTextarea
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Additional NZ Costs */}
            {/* Documents & Photos - Unified Upload */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Documents & Photos
              </h3>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676', marginBottom: '1.5rem' }}>
                Upload vehicle photos, buyer's license, signed contracts or any other documents. Multiple files accepted.
              </p>

              {/* Upload Area */}
              <div
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
                  e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.03)'
                  if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'rgba(29,78,216,0.6)'
                  e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.06)'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
                  e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.03)'
                }}
                style={{
                  border: '2px dashed rgba(29,78,216,0.3)',
                  borderRadius: '1rem',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(29,78,216,0.03)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(29,78,216,0.6)'
                  e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.06)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
                  e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.03)'
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp, application/pdf"
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files)
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                  id="edit-unified-upload"
                />
                <label htmlFor="edit-unified-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                  <Upload size={40} style={{ margin: '0 auto 1rem', color: '#1A1A1A' }} />
                  <p style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>
                    Drop files here or click to browse
                  </p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676' }}>
                    JPEG, PNG, WebP, or PDF – up to 10 files, 10MB each
                  </p>
                </label>
              </div>

              {/* Uploading Files */}
              {form.uploadingFiles.size > 0 && (
                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                  {Array.from(form.uploadingFiles.entries()).map(([fileId, { file, progress }]) => (
                    <div key={fileId} style={{
                      backgroundColor: '#E4EAF0',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.06)',
                      position: 'relative',
                    }}>
                      <div style={{
                        height: '80px',
                        backgroundColor: '#FFFFFF',
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
                            backgroundColor: '#1A1A1A',
                            width: `${progress}%`,
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <p style={{color: "#0D1B2A", whiteSpace: 'nowrap'}}>
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploaded Files Preview */}
              {form.uploadedDocuments.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: '#767676', marginBottom: '1rem' }}>
                    {form.uploadedDocuments.length} file(s) uploaded
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                    {form.uploadedDocuments.map((doc) => {
                      const url = doc.url
                      const filename = doc.filename || decodeURIComponent(url.split('/').pop() || 'file')
                      const isPdf = /\.pdf($|\?)/i.test(url)
                      const isUnavailable = isPdf && fileAvailability[url] === false
                      const isDeleting = deletingFileUrls.has(url)
                      const canProxyDownload = savedDocumentUrls.has(url)
                      const isDownloading = downloadingUrl === url
                      const downloadError = downloadErrors[url]
                      return (
                      <div key={url} style={{
                        backgroundColor: '#E4EAF0',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        border: isUnavailable ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        position: 'relative',
                        transition: 'all 0.2s',
                        opacity: isDeleting ? 0.6 : 1,
                      }}>
                        {isUnavailable ? (
                          <div style={{
                            height: '100px',
                            backgroundColor: 'rgba(239,68,68,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#EF4444',
                            fontSize: '1.5rem',
                            gap: '0.25rem',
                          }}>
                            <span>⚠️</span>
                            <span style={{ fontFamily: 'Outfit', fontSize: '0.6rem' }}>File unavailable</span>
                          </div>
                        ) : isPdf ? (
                          <div style={{
                            height: '100px',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1A1A1A',
                            fontSize: '2rem',
                          }}>
                            📄
                          </div>
                        ) : (
                          <img src={url} alt={filename} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        )}
                        <button
                          onClick={() => handleRemoveFile(url)}
                          disabled={isDeleting}
                          aria-label={isDeleting ? `Deleting ${filename}...` : `Remove ${filename}`}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239,68,68,0.9)',
                            color: "#FFFFFF",
                            border: 'none',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDeleting ? '…' : '×'}
                        </button>
                        <p style={{
                          fontFamily: 'Outfit', fontSize: '0.6rem', color: '#767676',
                          padding: '0.25rem 0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {filename}
                        </p>
                        {isUnavailable ? (
                          <p style={{
                            fontFamily: 'Outfit', fontSize: '0.55rem', color: '#767676',
                            textAlign: 'center', padding: '0.5rem', borderTop: '1px solid rgba(239,68,68,0.2)',
                          }}>
                            This file could not be retrieved
                          </p>
                        ) : (
                        <div style={{ display: 'flex' }}>
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{
                            flex: 1, display: 'block', padding: '0.5rem', fontFamily: 'Outfit', fontSize: '0.65rem',
                            color: '#1A1A1A', textDecoration: 'none', textAlign: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            View
                          </a>
                          {canProxyDownload ? (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(url, filename)}
                              disabled={downloadingUrl !== null}
                              aria-label={`Download ${filename}`}
                              style={{
                                flex: 1, display: 'block', padding: '0.5rem', fontFamily: 'Outfit', fontSize: '0.65rem',
                                color: '#1A1A1A', background: 'none', border: 'none', textAlign: 'center',
                                borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                                cursor: downloadingUrl !== null ? 'default' : 'pointer',
                                opacity: downloadingUrl !== null && !isDownloading ? 0.5 : 1,
                              }}>
                              {isDownloading ? 'Downloading…' : 'Download'}
                            </button>
                          ) : (
                            <a href={url} download={filename} target="_blank" rel="noopener noreferrer" aria-label={`Download ${filename}`} style={{
                              flex: 1, display: 'block', padding: '0.5rem', fontFamily: 'Outfit', fontSize: '0.65rem',
                              color: '#1A1A1A', textDecoration: 'none', textAlign: 'center',
                              borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                            }}>
                              Download
                            </a>
                          )}
                        </div>
                        )}
                        {downloadError && (
                          <p role="alert" style={{
                            fontFamily: 'Outfit', fontSize: '0.55rem', color: '#EF4444',
                            textAlign: 'center', padding: '0.35rem 0.5rem', borderTop: '1px solid rgba(239,68,68,0.2)',
                          }}>
                            {downloadError}
                          </p>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Summary */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0DC', borderRadius: '1rem',
            padding: 'clamp(1rem, 3vw, 1.5rem)', position: 'sticky', top: '1rem',
            width: '100%', boxSizing: 'border-box',
          }}>
            <h4 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', marginBottom: '1.5rem' }}>
              Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Sale Price</p>
                <p style={{color: "#1A1A1A" }}>{fmt(form.salePrice)}</p>
              </div>
              {form.paymentType !== 'cash' && (
                <>
                  {form.paymentType === 'mixed' && (
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Down Payment</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#22c55e' }}>{fmt(form.downPayment)}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Amount Financed</p>
                    <p style={{color: "#1A1A1A" }}>{fmt(calc.financedAmount)}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Total Interest</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#ef4444' }}>{fmt(calc.totalInterest)}</p>
                  </div>
                  <div style={{
                    backgroundColor: '#FFFFFF', borderRadius: '0.75rem', padding: '1rem',
                    border: '1px solid #E0E0DC', display: 'inline-flex', flexDirection: 'column',
                    minWidth: '180px', maxWidth: '260px',
                  }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.4rem' }}>Monthly Payment</p>
                    <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A' }}>{fmt(calc.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Total Repayment</p>
                    <p style={{color: "#1A1A1A" }}>{fmt(calc.totalPayment)}</p>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <AdminButton
                onClick={() => navigate(`/admin/sales/${id}`)}
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
              >
                Cancel
              </AdminButton>
              <AdminButton
                onClick={handleSave}
                disabled={saving}
                variant="primary"
                size="md"
                isLoading={saving}
                style={{ flex: 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </AdminButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
