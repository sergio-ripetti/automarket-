import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { getSaleById, updateSale, type Sale, type Documents } from '../../lib/salesService'
import { uploadImage, uploadDocument } from '../../lib/cloudinaryService'
import { sanitizeForFirestore } from '../../lib/sanitize'
import { showToast } from '../../lib/toast'
import AdminInput from '../../components/admin/AdminInput'
import AdminTextarea from '../../components/admin/AdminTextarea'
import AdminButton from '../../components/admin/AdminButton'
import AdminLabel from '../../components/admin/AdminLabel'

// Formats a numeric price as NZD currency
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

interface EditForm {
  buyerName: string
  buyerIdNumber: string
  buyerLicense: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string
  saleDate: string
  salePrice: number
  downPayment: number
  loanTerm: number
  notes: string
  uploadingFiles: Map<string, { file: File; progress: number; uploaded: boolean }>
  uploadedDocuments: string[]
}

// Admin page for editing an existing sale - loads sale data from Firestore, recalculates financing payments, and handles document uploads to Cloudinary
export default function AdminEditSale() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({
    buyerName: '', buyerIdNumber: '', buyerLicense: '', buyerEmail: '', buyerPhone: '', buyerAddress: '',
    saleDate: '', salePrice: 0, downPayment: 0, loanTerm: 24, notes: '',
    uploadingFiles: new Map(), uploadedDocuments: [],
  })

  const monthlyRate = 0.008
  const calc = {
    monthlyPayment: form.salePrice > 0 && form.downPayment < form.salePrice
      ? Math.round((form.salePrice - form.downPayment) * (monthlyRate * Math.pow(1 + monthlyRate, form.loanTerm)) / (Math.pow(1 + monthlyRate, form.loanTerm) - 1))
      : 0,
  }

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
            salePrice: data.paymentPlan.salePrice,
            downPayment: data.paymentPlan.downPayment,
            loanTerm: data.paymentPlan.termMonths,
            notes: data.notes,
            uploadingFiles: new Map(),
            uploadedDocuments: Array.isArray(data.documents?.uploadedDocuments) ? data.documents.uploadedDocuments : [],
          })
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

  // Uploads selected files (images or documents) to Cloudinary and tracks per-file progress in form state
  const handleFilesSelected = async (files: FileList) => {
    const newFiles = Array.from(files)
    const newUploading = new Map(form.uploadingFiles)

    for (const file of newFiles) {
      const fileId = `${file.name}-${Date.now()}`
      newUploading.set(fileId, { file, progress: 0, uploaded: false })
    }

    setForm((f) => ({ ...f, uploadingFiles: newUploading }))

    // Upload each file immediately
    for (const file of newFiles) {
      const fileId = `${file.name}-${Date.now()}`
      try {
        const url = file.type.startsWith('image/')
          ? await uploadImage(file, 'sales')
          : await uploadDocument(file, 'sales')

        setForm((f) => {
          const updated = new Map(f.uploadingFiles)
          updated.set(fileId, { ...updated.get(fileId)!, progress: 100, uploaded: true })
          return { ...f, uploadingFiles: updated, uploadedDocuments: [...f.uploadedDocuments, url] }
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
        showToast('Failed to upload file', 'error')
        setForm((f) => {
          const updated = new Map(f.uploadingFiles)
          updated.delete(fileId)
          return { ...f, uploadingFiles: updated }
        })
      }
    }
  }

  // Removes an already-uploaded document/image URL from the form's document list
  const handleRemoveFile = (url: string) => {
    setForm((f) => ({
      ...f,
      uploadedDocuments: f.uploadedDocuments.filter((u) => u !== url)
    }))
  }

  // Sanitizes and saves the edited sale (buyer info, payment plan, documents) to Firestore
  const handleSave = async () => {
    if (!id || !sale) return
    setSaving(true)
    try {
      const updatedSale: Partial<Sale> = {
        buyer: {
          name: form.buyerName,
          idNumber: form.buyerIdNumber,
          email: form.buyerEmail,
          phone: form.buyerPhone,
          address: form.buyerAddress,
          licenseNumber: form.buyerLicense,
        },
        saleDate: form.saleDate,
        notes: form.notes,
        paymentPlan: {
          ...sale.paymentPlan,
          salePrice: form.salePrice,
          downPayment: form.downPayment,
          termMonths: form.loanTerm,
          monthlyPayment: calc.monthlyPayment,
        },
        // additionalCosts removed - use VehicleInfo, ORC, etc. from new structure
        documents: { uploadedDocuments: form.uploadedDocuments } as unknown as Documents,
      }
      const safeSaleData = sanitizeForFirestore(updatedSale) as Partial<Sale>
      await updateSale(id, safeSaleData)
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
          padding: '0.75rem 1.5rem', borderRadius: '0.625rem',
          background: '#1A1A1A', color: "#0D1B2A",
          fontFamily: 'Outfit', cursor: 'pointer', border: 'none',
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
            <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#C4FF00', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
              Buyer Information
            </h3>
            <div className="admin-edit-sale-grid-2col">
              <AdminInput
                label="Full Name"
                type="text"
                value={form.buyerName}
                onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
              />
              <AdminInput
                label="ID Number"
                type="text"
                value={form.buyerIdNumber}
                onChange={(e) => setForm((f) => ({ ...f, buyerIdNumber: e.target.value }))}
              />
              <AdminInput
                label="Email"
                type="text"
                value={form.buyerEmail}
                onChange={(e) => setForm((f) => ({ ...f, buyerEmail: e.target.value }))}
              />
              <AdminInput
                label="Phone"
                type="text"
                value={form.buyerPhone}
                onChange={(e) => setForm((f) => ({ ...f, buyerPhone: e.target.value }))}
              />
              <AdminInput
                label="License Number"
                type="text"
                value={form.buyerLicense}
                onChange={(e) => setForm((f) => ({ ...f, buyerLicense: e.target.value }))}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <AdminInput
                  label="Address"
                  type="text"
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
            <h3 className="font-bebas" style={{ fontSize: '1.1rem', color: '#C4FF00', marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
              Payment Information
            </h3>
            <div className="admin-edit-sale-grid-2col">
              <AdminInput
                label="Sale Date"
                type="date"
                value={form.saleDate}
                onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
              />
              <AdminInput
                label="Sale Price (NZD)"
                type="number"
                value={form.salePrice.toString()}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: Number(e.target.value) }))}
              />
              {sale.paymentPlan.type !== 'cash' && (
                <>
                  <AdminInput
                    label="Down Payment (NZD)"
                    type="number"
                    value={form.downPayment.toString()}
                    onChange={(e) => setForm((f) => ({ ...f, downPayment: Number(e.target.value) }))}
                  />
                  <AdminInput
                    label="Loan Term (months)"
                    type="number"
                    value={form.loanTerm.toString()}
                    onChange={(e) => setForm((f) => ({ ...f, loanTerm: Number(e.target.value) }))}
                  />
                </>
              )}
            </div>
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
                  accept="image/*, application/pdf, .doc, .docx"
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                  style={{ display: 'none' }}
                  id="edit-unified-upload"
                />
                <label htmlFor="edit-unified-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                  <Upload size={40} style={{ margin: '0 auto 1rem', color: '#C4FF00' }} />
                  <p style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>
                    Drop files here or click to browse
                  </p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676' }}>
                    Images, PDFs, documents — all types accepted
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
                            backgroundColor: '#C4FF00',
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
                    {form.uploadedDocuments.map((url) => (
                      <div key={url} style={{
                        backgroundColor: '#E4EAF0',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.06)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}>
                        {url.includes('image') && !url.includes('.pdf') ? (
                          <img src={url} alt="uploaded" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            height: '100px',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#C4FF00',
                            fontSize: '2rem',
                          }}>
                            📄
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveFile(url)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239,68,68,0.9)',
                            color: "#0D1B2A",
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{
                          display: 'block',
                          padding: '0.5rem',
                          fontFamily: 'Outfit',
                          fontSize: '0.65rem',
                          color: '#C4FF00',
                          textDecoration: 'none',
                          textAlign: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          View
                        </a>
                      </div>
                    ))}
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
            background: 'linear-gradient(135deg, #E4EAF0, #FFFFFF)',
            border: '1px solid rgba(29,78,216,0.15)', borderRadius: '1rem',
            padding: 'clamp(1rem, 3vw, 1.5rem)', position: 'sticky', top: '1rem',
            width: '100%', boxSizing: 'border-box',
          }}>
            <h4 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', marginBottom: '1.5rem' }}>
              Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Sale Price</p>
                <p style={{color: "#0D1B2A" }}>{fmt(form.salePrice)}</p>
              </div>
              {sale.paymentPlan.type !== 'cash' && (
                <>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Down Payment</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#22c55e' }}>{fmt(form.downPayment)}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Amount Financed</p>
                    <p style={{color: "#0D1B2A" }}>{fmt(form.salePrice - form.downPayment)}</p>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.75rem', padding: '1rem',
                    border: '1px solid rgba(29,78,216,0.1)',
                  }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.5rem' }}>Monthly Payment</p>
                    <p className="font-bebas" style={{ fontSize: '2rem', color: '#C4FF00' }}>{fmt(calc.monthlyPayment)}</p>
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
