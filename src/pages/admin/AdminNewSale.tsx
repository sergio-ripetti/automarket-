import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CheckCircle, CreditCard, DollarSign, Split, Upload, ChevronDown, X } from 'lucide-react'
import { getCars } from '../../lib/carsService'
import { addSale, generatePaymentSchedule, type Buyer, type PaymentPlan, type PaymentRecord, type Sale, type VehicleInfo, type ORC, type ExtraAccessories, type FinancingFees, type Warranty, type MechanicalInsurance, type Documents } from '../../lib/salesService'
import { uploadImage, uploadDocument } from '../../lib/cloudinaryService'
import { sanitizeForFirestore } from '../../lib/sanitize'
import { showToast } from '../../lib/toast'
import { AdminInput, AdminSelect, AdminTextarea, AdminLabel, AdminCheckbox, AdminButton } from '../../components/admin'
import type { Car } from '../../types'

// Formats a number as NZD currency for display
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

interface FormData {
  // Step 1
  carId: string
  vin: string
  plate: string
  isNZNew: boolean
  originCountry: string
  previousOwners: number
  hasMaintenanceHistory: boolean
  // Step 2
  buyerName: string
  buyerIdNumber: string
  buyerLicense: string
  buyerEmail: string
  buyerPhone: string
  buyerAddress: string
  // Step 3
  saleDate: string
  paymentType: 'cash' | 'financing' | 'mixed'
  salePrice: number
  downPayment: number
  loanTerm: number
  firstPaymentDate: string
  notes: string
  // ORC
  orcIncluded: boolean
  driveAwayPrice: boolean
  orcWof: number
  orcRegistration: number
  orcRegistrationMonths: 6 | 12
  orcGrooming: number
  orcOwnershipTransfer: number
  orcMechanicalInspection: number
  orcOtherLabel: string
  orcOtherAmount: number
  // Accessories
  accessories: Array<{ description: string; price: number }>
  // Financing Fees
  ffEstablishment: number
  ffPpsr: number
  ffMonthlyAccount: number
  ffDealerOrigination: number
  // Warranty
  warrantyIncluded: boolean
  warrantyMonths: number
  warrantyProvider: string
  mechInsuranceIncluded: boolean
  mechInsuranceMonths: number
  mechInsuranceProvider: string
  // Documents
  uploadingFiles: Map<string, { file: File; progress: number; uploaded: boolean }>
  uploadedDocuments: string[]
}

// Multi-step admin form for recording a new vehicle sale - collects vehicle, buyer, and payment details,
// uploads supporting documents to Cloudinary, and saves the completed sale record to Firestore
export default function AdminNewSale() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [cars, setCars] = useState<Car[]>([])
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [carsOpen, setCarsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState<FormData>({
    carId: '', vin: '', plate: '', isNZNew: true, originCountry: 'Japan', previousOwners: 0, hasMaintenanceHistory: false,
    buyerName: '', buyerIdNumber: '', buyerLicense: '', buyerEmail: '', buyerPhone: '', buyerAddress: '',
    saleDate: new Date().toISOString().split('T')[0],
    paymentType: 'cash', salePrice: 0, downPayment: 0, loanTerm: 24,
    firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    orcIncluded: false, driveAwayPrice: false,
    orcWof: 0, orcRegistration: 0, orcRegistrationMonths: 6, orcGrooming: 0, orcOwnershipTransfer: 0, orcMechanicalInspection: 0, orcOtherLabel: '', orcOtherAmount: 0,
    accessories: [],
    ffEstablishment: 0, ffPpsr: 10, ffMonthlyAccount: 0, ffDealerOrigination: 0,
    warrantyIncluded: false, warrantyMonths: 3, warrantyProvider: '', mechInsuranceIncluded: false, mechInsuranceMonths: 3, mechInsuranceProvider: '',
    uploadingFiles: new Map(), uploadedDocuments: [],
  })
  const [orcExpanded, setOrcExpanded] = useState(false)
  const [accessoriesExpanded, setAccessoriesExpanded] = useState(false)
  const [financingFeesExpanded, setFinancingFeesExpanded] = useState(false)
  const [warrantyExpanded, setWarrantyExpanded] = useState(false)

  // Fetches the full car inventory from Firestore on mount and pre-selects a car if one was already chosen
  useEffect(() => {
    getCars().then((data) => {
      setCars(data)
      if (form.carId) {
        const car = data.find((c) => c.id === form.carId)
        setSelectedCar(car || null)
      }
    })
  }, [])

  // Syncs the sale price field with the selected car's listed price whenever the selection changes
  useEffect(() => {
    if (selectedCar) {
      setForm((f) => ({ ...f, salePrice: selectedCar.price }))
    }
  }, [selectedCar])

  const filteredCars = useMemo(() => {
    if (!searchInput) return cars
    const q = searchInput.toLowerCase()
    return cars.filter((c) => c.title.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q))
  }, [cars, searchInput])

  const monthlyRate = 0.008
  // Calculates monthly payment, total payment, and total interest for the selected payment type (cash/financing/mixed)
  const calc = useMemo(() => {
    if (form.paymentType === 'cash') {
      return { monthlyPayment: 0, totalPayment: form.salePrice, totalInterest: 0, financedAmount: 0 }
    }
    const financed = form.paymentType === 'mixed' ? form.salePrice - form.downPayment : form.salePrice
    const rate = monthlyRate
    const months = form.loanTerm
    const monthlyPayment = financed * (rate * (1 + rate) ** months) / ((1 + rate) ** months - 1)
    const totalPayment = monthlyPayment * months + form.downPayment
    const totalInterest = totalPayment - form.salePrice
    return { monthlyPayment: Math.round(monthlyPayment * 100) / 100, totalPayment, totalInterest: Math.round(totalInterest * 100) / 100, financedAmount: financed }
  }, [form.paymentType, form.salePrice, form.downPayment, form.loanTerm])

  // Validates whether the current step's required fields are filled before allowing navigation to the next step
  const canNext = () => {
    if (step === 1) return !!selectedCar && form.vin.trim() && form.plate.trim()
    if (step === 2) {
      return form.buyerName && form.buyerIdNumber && form.buyerLicense && form.buyerEmail && form.buyerPhone && form.buyerAddress && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail)
    }
    return true
  }

  const orcTotal = form.orcIncluded ? 0 : form.orcWof + form.orcRegistration + form.orcGrooming + form.orcOwnershipTransfer + form.orcMechanicalInspection + form.orcOtherAmount
  const accessoriesTotal = form.accessories.reduce((sum, a) => sum + a.price, 0)
  const financingFeesTotal = form.paymentType === 'cash' ? 0 : form.ffEstablishment + form.ffPpsr + form.ffMonthlyAccount + form.ffDealerOrigination
  const subtotal = form.salePrice + orcTotal + accessoriesTotal + financingFeesTotal
  const gst = Math.round(subtotal * 0.15)
  const totalCostToBuyer = subtotal + gst

  // Uploads selected/dropped files (images or documents) to Cloudinary one by one, tracking per-file progress in form state
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

  // Removes a previously uploaded document/image URL from the form's list of attached documents
  const handleRemoveFile = (url: string) => {
    setForm((f) => ({
      ...f,
      uploadedDocuments: f.uploadedDocuments.filter((u) => u !== url)
    }))
  }

  // Assembles the full sale record (buyer, vehicle, payment plan, ORC, fees, warranty, documents) from form state,
  // sanitizes it, and saves it to Firestore, then redirects to the new sale's detail page
  const handleSubmit = async () => {
    if (!selectedCar) return
    setLoading(true)
    try {
      const buyer: Buyer = {
        name: form.buyerName,
        idNumber: form.buyerIdNumber,
        email: form.buyerEmail,
        phone: form.buyerPhone,
        address: form.buyerAddress,
        licenseNumber: form.buyerLicense,
      }

      let payments: PaymentRecord[] = []
      const paymentPlan: PaymentPlan = {
        type: form.paymentType,
        salePrice: form.salePrice,
        downPayment: form.paymentType === 'cash' ? 0 : form.downPayment,
        financedAmount: calc.financedAmount,
        monthlyRate: monthlyRate * 100,
        termMonths: form.loanTerm,
        monthlyPayment: calc.monthlyPayment,
        totalPayment: calc.totalPayment,
        totalInterest: calc.totalInterest,
        firstPaymentDate: form.firstPaymentDate,
      }

      if (form.paymentType !== 'cash') {
        payments = generatePaymentSchedule(calc.financedAmount, form.loanTerm, monthlyRate * 100, form.firstPaymentDate)
      }

      const vehicleInfo: VehicleInfo = {
        vin: form.vin,
        plate: form.plate,
        isNZNew: form.isNZNew,
        originCountry: form.originCountry,
        previousOwners: Number(form.previousOwners) || 0,
        hasMaintenanceHistory: form.hasMaintenanceHistory,
      }

      const orc: ORC = {
        wof: Number(form.orcWof) || 0,
        registration: Number(form.orcRegistration) || 0,
        registrationMonths: form.orcRegistrationMonths,
        grooming: Number(form.orcGrooming) || 0,
        ownershipTransfer: Number(form.orcOwnershipTransfer) || 0,
        mechanicalInspection: Number(form.orcMechanicalInspection) || 0,
        otherLabel: form.orcOtherLabel || '',
        otherAmount: Number(form.orcOtherAmount) || 0,
        orcTotal: orcTotal,
        orcIncluded: form.orcIncluded,
        driveAwayPrice: form.driveAwayPrice,
      }

      const extraAccessories: ExtraAccessories = {
        items: form.accessories,
        total: accessoriesTotal,
      }

      const financingFees: FinancingFees | undefined = form.paymentType !== 'cash' ? {
        establishmentFee: Number(form.ffEstablishment) || 0,
        ppsr: Number(form.ffPpsr) || 0,
        monthlyAccountFee: Number(form.ffMonthlyAccount) || 0,
        dealerOriginationFee: Number(form.ffDealerOrigination) || 0,
        total: financingFeesTotal,
      } : undefined

      const warranty: Warranty | undefined = form.warrantyIncluded ? {
        included: true,
        months: Number(form.warrantyMonths) || 3,
        provider: form.warrantyProvider,
      } : undefined

      const mechanicalInsurance: MechanicalInsurance | undefined = form.mechInsuranceIncluded ? {
        included: true,
        months: Number(form.mechInsuranceMonths) || 3,
        provider: form.mechInsuranceProvider,
      } : undefined

      const saleStatus = form.paymentType === 'cash' ? 'completed' : 'active'

      const sale: Omit<Sale, 'id' | 'createdAt'> = {
        carId: form.carId,
        carTitle: selectedCar.title,
        carBrand: selectedCar.brand,
        carModel: selectedCar.model,
        carYear: selectedCar.year,
        carColor: selectedCar.color,
        carImages: selectedCar.images,
        buyer,
        paymentPlan,
        payments,
        status: saleStatus,
        saleDate: form.saleDate,
        notes: form.notes,
        vehicleInfo,
        orc,
        extraAccessories,
        financingFees,
        warranty,
        mechanicalInsurance,
        documents: { uploadedDocuments: form.uploadedDocuments } as unknown as Documents,
      }

      const safeSaleData = sanitizeForFirestore(sale) as Omit<Sale, 'id' | 'createdAt'>
      const saleId = await addSale(safeSaleData)
      setSubmitted(true)
      setTimeout(() => {
        navigate(`/admin/sales/${saleId}`)
      }, 2000)
    } catch (err) {
      console.error('Submit failed:', err)
      showToast('Failed to save sale', 'error')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <CheckCircle size={64} color="#22c55e" style={{ marginBottom: '1.5rem' }} />
        <h2 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '1rem' }}>Sale Recorded!</h2>
        <p style={{ fontFamily: 'Outfit', color: '#767676', marginBottom: '2rem', maxWidth: '400px' }}>
          {selectedCar?.title} sold to {form.buyerName} for {fmt(form.salePrice)}. Redirecting...
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(1rem, 4vw, 2rem)', marginBottom: 'clamp(1.5rem, 4vw, 3rem)', flexWrap: 'wrap' }}>
        {([1, 2, 3] as const).map((s) => (
          <div key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: s < step ? '#22c55e' : s === step ? '#1A1A1A' : '#E0E0DC',
                color: s < step ? 'white' : s === step ? '#1A1A1A' : '#767676',
                fontWeight: 700, fontSize: '1rem',
              }}>
                {s < step ? <CheckCircle size={20} /> : s}
              </div>
              <span className="font-bebas" style={{
                fontSize: '0.9rem', color: s === step ? '#1A1A1A' : '#767676',
              }}>
                {s === 1 ? 'Vehicle' : s === 2 ? 'Buyer' : 'Payment'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Select Vehicle */}
      {step === 1 && (
        <div>
          <h2 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '1.5rem' }}>Select Vehicle</h2>
          <div style={{ position: 'relative', marginBottom: '2rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#C8D8E4' }} />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 0 0.5rem 2.5rem', borderRadius: 0,
                backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC', color: "#0D1B2A",
                fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#1A1A1A'; setCarsOpen(true) }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E0E0DC'; setTimeout(() => setCarsOpen(false), 200) }}
            />
            {carsOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#E4EAF0',
                border: '1px solid rgba(29,78,216,0.2)', borderRadius: 0, marginTop: '0.5rem',
                maxHeight: '300px', overflowY: 'auto', zIndex: 10,
              }}>
                {filteredCars.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCar(c)
                      setForm((f) => ({ ...f, carId: c.id }))
                      setCarsOpen(false)
                      setSearchInput('')
                    }}
                    style={{
                      padding: '0.75rem 0 0.5rem 0', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(29,78,216,0.05)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <img src={c.images[0]} alt="" style={{ width: '50px', height: '36px', borderRadius: '0.375rem', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <p className="font-bebas" style={{color: "#0D1B2A" }}>{c.title}</p>
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>
                          {c.year} â€¢ {c.km.toLocaleString()} km
                        </p>
                      </div>
                      <p className="font-bebas" style={{ fontSize: '0.9rem', color: '#1A1A1A' }}>{fmt(c.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCar && (
            <>
              <div style={{
                backgroundColor: 'transparent', border: '1px solid rgba(29,78,216,0.15)',
                borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)',
              }}>
                <img src={selectedCar.images[0]} alt="" style={{ width: '100%', height: '180px', borderRadius: '0.75rem', objectFit: 'cover', marginBottom: '1rem' }} />
                <h3 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>{selectedCar.title}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Year â€¢ KM</p>
                    <p style={{color: "#0D1B2A" }}>{selectedCar.year} â€¢ {selectedCar.km.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Transmission â€¢ Fuel</p>
                    <p style={{color: "#0D1B2A" }}>{selectedCar.transmission} â€¢ {selectedCar.fuel}</p>
                  </div>
                </div>
                <p className="font-bebas" style={{ fontSize: '1.25rem', color: '#1A1A1A', marginBottom: '1rem' }}>{fmt(selectedCar.price)}</p>
                <button
                  onClick={() => {
                    setSelectedCar(null)
                    setForm((f) => ({ ...f, carId: '' }))
                  }}
                  style={{
                    padding: '0.75rem 1.5rem', borderRadius: 0,
                    backgroundColor: 'transparent', border: '1px solid rgba(29,78,216,0.3)',
                    color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.875rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  Change Vehicle
                </button>
              </div>

              <div style={{
                backgroundColor: 'transparent', border: '1px solid rgba(29,78,216,0.15)',
                borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)',
              }}>
                <h3 className="font-bebas" style={{ fontSize: '1.25rem', color: '#1A1A1A', marginBottom: '1rem' }}>Vehicle Details *</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1.5rem' }}>
                  <div>
                    <AdminInput
                      type="text"
                      label="VIN / CHASSIS NUMBER"
                      value={form.vin}
                      onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
                      placeholder="e.g. JTHBP5C1XA5034760"
                      required
                    />
                  </div>
                  <div>
                    <AdminInput
                      type="text"
                      label="LICENSE PLATE"
                      value={form.plate}
                      onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                      placeholder="e.g. ABC123"
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                    color: '#767676', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: '1rem',
                  }}>
                    Vehicle Origin *
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      <input
                        type="radio"
                        checked={form.isNZNew}
                        onChange={() => setForm((f) => ({ ...f, isNZNew: true }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{color: "#0D1B2A" }}>NZ New</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                      <input
                        type="radio"
                        checked={!form.isNZNew}
                        onChange={() => setForm((f) => ({ ...f, isNZNew: false }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{color: "#0D1B2A" }}>Used Import</span>
                    </label>
                  </div>
                </div>

                {!form.isNZNew && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <AdminInput
                      type="text"
                      label="COUNTRY OF ORIGIN"
                      value={form.originCountry}
                      onChange={(e) => setForm((f) => ({ ...f, originCountry: e.target.value }))}
                      placeholder="e.g. Japan, Australia, USA"
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{
                      display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                      color: '#767676', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '0.5rem',
                    }}>
                      Previous Owners
                    </label>
                    <input
                      type="number"
                      value={form.previousOwners}
                      onChange={(e) => setForm((f) => ({ ...f, previousOwners: Math.max(0, Number(e.target.value) || 0) }))}
                      min="0"
                      style={{
                        width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                        backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                        color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                      color: '#767676', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '0.5rem',
                    }}>
                      Maintenance History
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setForm((f) => ({ ...f, hasMaintenanceHistory: true }))}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: 0,
                          backgroundColor: form.hasMaintenanceHistory ? '#1A1A1A' : '#F2F2F0',
                          color: form.hasMaintenanceHistory ? '#FFFFFF' : '#4A4A4A',
                          fontFamily: 'Outfit', fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #E0E0DC', cursor: 'pointer',
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setForm((f) => ({ ...f, hasMaintenanceHistory: false }))}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: 0,
                          backgroundColor: !form.hasMaintenanceHistory ? '#1A1A1A' : '#F2F2F0',
                          color: !form.hasMaintenanceHistory ? '#FFFFFF' : '#4A4A4A',
                          fontFamily: 'Outfit', fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #E0E0DC', cursor: 'pointer',
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              onClick={() => navigate('/admin/sales')}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                color: "#0D1B2A", fontFamily: 'Outfit', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canNext()}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                background: '#1A1A1A',
                color: "#FFFFFF", fontFamily: 'Outfit', fontWeight: 600,
                cursor: canNext() ? 'pointer' : 'not-allowed', opacity: canNext() ? 1 : 0.5,
                border: 'none',
              }}
            >
              Next Step â†’
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Buyer Details */}
      {step === 2 && (
        <div>
          <h2 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '1.5rem' }}>Buyer Information</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: '2rem',
          }}>
            {[
              { label: 'Full Name', key: 'buyerName', required: true },
              { label: 'Email', key: 'buyerEmail', type: 'email', required: true },
              { label: 'ID Number', key: 'buyerIdNumber', placeholder: 'e.g. AB123456', required: true },
              { label: 'Phone', key: 'buyerPhone', required: true },
              { label: 'Driver License', key: 'buyerLicense', required: true },
              { label: 'Address', key: 'buyerAddress', required: true },
            ].map(({ label, key, placeholder, type, required }) => (
              <div key={key} style={{ gridColumn: key === 'buyerAddress' ? '1 / -1' : 'auto' }}>
                <label style={{
                  display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                  color: '#767676', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '0.5rem',
                }}>
                  {label} {required ? '*' : ''}
                </label>
                <input
                  type={type || 'text'}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                    backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                    color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                color: "#0D1B2A", fontFamily: 'Outfit', cursor: 'pointer',
              }}
            >
              â† Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext()}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                background: '#1A1A1A',
                color: "#FFFFFF", fontFamily: 'Outfit', fontWeight: 600,
                cursor: canNext() ? 'pointer' : 'not-allowed', opacity: canNext() ? 1 : 0.5,
                border: 'none',
              }}
            >
              Next Step â†’
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment Plan */}
      {step === 3 && selectedCar && (
        <div>
          <h2 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '1.5rem' }}>Payment Plan</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
              color: '#767676', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '0.5rem',
            }}>
              Sale Date *
            </label>
            <input
              type="date"
              value={form.saleDate}
              onChange={(e) => setForm((f) => ({ ...f, saleDate: e.target.value }))}
              style={{
                width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1A1A1A' }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0DC' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
              color: '#767676', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Payment Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 'clamp(0.5rem, 2vw, 1rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)', width: '100%', boxSizing: 'border-box' }}>
              {[
                { type: 'cash' as const, icon: DollarSign, title: 'Cash', desc: 'Full payment upfront' },
                { type: 'financing' as const, icon: CreditCard, title: 'Financing', desc: 'Monthly installments' },
                { type: 'mixed' as const, icon: Split, title: 'Mixed', desc: 'Down payment + finance' },
              ].map(({ type, icon: Icon, title, desc }) => (
                <div
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, paymentType: type }))}
                  style={{
                    backgroundColor: form.paymentType === type ? 'rgba(29,78,216,0.05)' : '#FFFFFF',
                    border: `2px solid ${form.paymentType === type ? '#1A1A1A' : 'transparent'}`,
                    borderRadius: '1rem', padding: '1.5rem', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (form.paymentType !== type) e.currentTarget.style.borderColor = 'rgba(29,78,216,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    if (form.paymentType !== type) e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <Icon size={24} color={form.paymentType === type ? '#1A1A1A' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: '0.75rem' }} />
                  <p className="font-bebas" style={{color: "#0D1B2A", marginBottom: '0.25rem' }}>{title}</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Financing fields */}
          {form.paymentType !== 'cash' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                  color: '#767676', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '0.5rem',
                }}>
                  Sale Price (NZD) *
                </label>
                <input
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                    backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                    color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                />
              </div>

              {form.paymentType === 'mixed' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                    color: '#767676', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: '0.5rem',
                  }}>
                    Down Payment (NZD) *
                  </label>
                  <input
                    type="number"
                    value={form.downPayment}
                    onChange={(e) => setForm((f) => ({ ...f, downPayment: Number(e.target.value) }))}
                    style={{
                      width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                      backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                      color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#1A1A1A' }}
                    onBlur={(e) => { e.target.style.borderColor = '#E0E0DC' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                  color: '#767676', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '1rem',
                }}>
                  Loan Term (months) *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[12, 24, 36, 48, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, loanTerm: m }))}
                      style={{
                        padding: '0.5rem 1rem', borderRadius: 0, border: 'none',
                        backgroundColor: form.loanTerm === m ? '#1A1A1A' : 'rgba(255,255,255,0.1)',
                        color: form.loanTerm === m ? 'white' : 'rgba(255,255,255,0.5)',
                        fontFamily: 'Outfit', fontSize: '0.875rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                  color: '#767676', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '0.5rem',
                }}>
                  First Payment Date *
                </label>
                <input
                  type="date"
                  value={form.firstPaymentDate}
                  onChange={(e) => setForm((f) => ({ ...f, firstPaymentDate: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                    backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                    color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                />
              </div>

              <div style={{
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem',
                color: '#767676',
              }}>
                <p>Fixed monthly rate: <strong style={{color: "#0D1B2A" }}>0.8%</strong></p>
              </div>
            </div>
          )}

          {/* Sale Price for cash */}
          {form.paymentType === 'cash' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                color: '#767676', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: '0.5rem',
              }}>
                Sale Price (NZD) *
              </label>
              <input
                type="number"
                value={form.salePrice}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: Number(e.target.value) }))}
                style={{
                  width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                  backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                  color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1A1A1A' }}
                onBlur={(e) => { e.target.style.borderColor = '#E0E0DC' }}
              />
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
              color: '#767676', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '0.5rem',
            }}>
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add any notes about this sale..."
              style={{
                width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                minHeight: '100px', resize: 'vertical',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1A1A1A' }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0DC' }}
            />
          </div>

          {/* SECTION A: ORC (On Road Costs) */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: 'transparent', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOrcExpanded(!orcExpanded)}
              style={{
                width: '100%', padding: '1rem', backgroundColor: 'transparent',
                border: 'none', color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.9rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                ORC - On Road Costs (Optional)
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', fontWeight: 400, marginTop: '0.25rem' }}>
                  Typical range: NZ$300â€“NZ$650
                </p>
              </div>
              <ChevronDown size={16} style={{ transform: orcExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>
            {orcExpanded && (
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                    <input
                      type="checkbox"
                      checked={form.orcIncluded}
                      onChange={(e) => setForm((f) => ({ ...f, orcIncluded: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{color: "#0D1B2A", fontSize: '0.875rem' }}>ORC Included in Price</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
                    <input
                      type="checkbox"
                      checked={form.driveAwayPrice}
                      onChange={(e) => setForm((f) => ({ ...f, driveAwayPrice: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{color: "#0D1B2A", fontSize: '0.875rem' }}>Drive Away Price</span>
                  </label>
                </div>

                {!form.orcIncluded && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        WoF (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.orcWof}
                        onChange={(e) => setForm((f) => ({ ...f, orcWof: Number(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Registration (NZD)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.5rem' }}>
                        <select
                          value={form.orcRegistrationMonths}
                          onChange={(e) => setForm((f) => ({ ...f, orcRegistrationMonths: Number(e.target.value) as 6 | 12 }))}
                          style={{
                            padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem',
                          }}
                        >
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                        </select>
                        <input
                          type="number"
                          value={form.orcRegistration}
                          onChange={(e) => setForm((f) => ({ ...f, orcRegistration: Number(e.target.value) || 0 }))}
                          style={{
                            padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Grooming/Detailing (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.orcGrooming}
                        onChange={(e) => setForm((f) => ({ ...f, orcGrooming: Number(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Ownership Transfer (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.orcOwnershipTransfer}
                        onChange={(e) => setForm((f) => ({ ...f, orcOwnershipTransfer: Number(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Mechanical Inspection (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.orcMechanicalInspection}
                        onChange={(e) => setForm((f) => ({ ...f, orcMechanicalInspection: Number(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Other Cost Label
                      </label>
                      <input
                        type="text"
                        value={form.orcOtherLabel}
                        onChange={(e) => setForm((f) => ({ ...f, orcOtherLabel: e.target.value }))}
                        placeholder="e.g., Inspection"
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Other Cost Amount (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.orcOtherAmount}
                        onChange={(e) => setForm((f) => ({ ...f, orcOtherAmount: Number(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>ORC Total</p>
                  <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A' }}>{fmt(orcTotal)}</p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: Extra Accessories */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: 'transparent', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
              style={{
                width: '100%', padding: '1rem', backgroundColor: 'transparent',
                border: 'none', color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.9rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                Extra Accessories / Add-ons (Optional)
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', fontWeight: 400, marginTop: '0.25rem' }}>
                  Additional items installed or included with the vehicle
                </p>
              </div>
              <ChevronDown size={16} style={{ transform: accessoriesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>
            {accessoriesExpanded && (
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                  {form.accessories.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '0.75rem', alignItems: 'start' }}>
                      <div>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newAccessories = [...form.accessories]
                            newAccessories[idx].description = e.target.value
                            setForm((f) => ({ ...f, accessories: newAccessories }))
                          }}
                          placeholder="e.g., Roof Rack"
                          style={{
                            width: '100%', padding: '0.75rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const newAccessories = [...form.accessories]
                            newAccessories[idx].price = Number(e.target.value) || 0
                            setForm((f) => ({ ...f, accessories: newAccessories }))
                          }}
                          placeholder="0"
                          style={{
                            width: '100%', padding: '0.75rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newAccessories = form.accessories.filter((_, i) => i !== idx)
                          setForm((f) => ({ ...f, accessories: newAccessories }))
                        }}
                        style={{
                          padding: '0.75rem', borderRadius: 0,
                          backgroundColor: 'rgba(239,68,68,0.2)', border: 'none', cursor: 'pointer',
                          color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setForm((f) => ({ ...f, accessories: [...f.accessories, { description: '', price: 0 }] }))}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 0,
                    backgroundColor: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.3)',
                    color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.875rem',
                    cursor: 'pointer', marginBottom: '1rem',
                  }}
                >
                  + Add Item
                </button>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Accessories Total</p>
                  <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A' }}>{fmt(accessoriesTotal)}</p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: Financing Fees (only if not cash) */}
          {form.paymentType !== 'cash' && (
            <div style={{ marginBottom: '1.5rem', backgroundColor: 'transparent', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setFinancingFeesExpanded(!financingFeesExpanded)}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: 'transparent',
                  border: 'none', color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  Financing Fees
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', fontWeight: 400, marginTop: '0.25rem' }}>
                    Standard NZ financing costs
                  </p>
                </div>
                <ChevronDown size={16} style={{ transform: financingFeesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {financingFeesExpanded && (
                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Establishment Fee (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.ffEstablishment}
                        onChange={(e) => setForm((f) => ({ ...f, ffEstablishment: Number(e.target.value) || 0 }))}
                        placeholder="380"
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', marginTop: '0.25rem' }}>
                        Typically NZ$150â€“500
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        PPSR Fee (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.ffPpsr}
                        onChange={(e) => setForm((f) => ({ ...f, ffPpsr: Number(e.target.value) || 0 }))}
                        placeholder="10"
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', marginTop: '0.25rem' }}>
                        Personal Property Securities Register ~$10
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Monthly Account Fee (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.ffMonthlyAccount}
                        onChange={(e) => setForm((f) => ({ ...f, ffMonthlyAccount: Number(e.target.value) || 0 }))}
                        placeholder="5"
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', marginTop: '0.25rem' }}>
                        Monthly admin fee
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                        color: '#767676', letterSpacing: '0.1em',
                        textTransform: 'uppercase', marginBottom: '0.5rem',
                      }}>
                        Dealer Origination Fee (NZD)
                      </label>
                      <input
                        type="number"
                        value={form.ffDealerOrigination}
                        onChange={(e) => setForm((f) => ({ ...f, ffDealerOrigination: Number(e.target.value) || 0 }))}
                        placeholder="350"
                        style={{
                          width: '100%', padding: '0.75rem 0 0.5rem 0', borderRadius: 0,
                          backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                          color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                        onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                      />
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: '#767676', marginTop: '0.25rem' }}>
                        Typically NZ$350â€“500
                      </p>
                    </div>
                  </div>

                  <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Financing Fees Total</p>
                    <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A' }}>{fmt(financingFeesTotal)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION D: Warranty & Insurance */}
          <div style={{ marginBottom: '1.5rem', backgroundColor: 'transparent', borderRadius: '0.875rem', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setWarrantyExpanded(!warrantyExpanded)}
              style={{
                width: '100%', padding: '1rem', backgroundColor: 'transparent',
                border: 'none', color: '#1A1A1A', fontFamily: 'Outfit', fontSize: '0.9rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                Warranty & Insurance (Optional)
              </div>
              <ChevronDown size={16} style={{ transform: warrantyExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>
            {warrantyExpanded && (
              <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={form.warrantyIncluded}
                      onChange={(e) => setForm((f) => ({ ...f, warrantyIncluded: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{color: "#0D1B2A", fontSize: '0.875rem' }}>Mechanical Warranty</span>
                  </label>
                  {form.warrantyIncluded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginLeft: '1.5rem' }}>
                      <div>
                        <label style={{
                          display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                          color: '#767676', letterSpacing: '0.1em',
                          textTransform: 'uppercase', marginBottom: '0.5rem',
                        }}>
                          Months
                        </label>
                        <select
                          value={form.warrantyMonths}
                          onChange={(e) => setForm((f) => ({ ...f, warrantyMonths: Number(e.target.value) as any }))}
                          style={{
                            width: '100%', padding: '0.75rem 1rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem',
                          }}
                        >
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                        </select>
                      </div>
                      <div>
                        <label style={{
                          display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                          color: '#767676', letterSpacing: '0.1em',
                          textTransform: 'uppercase', marginBottom: '0.5rem',
                        }}>
                          Provider
                        </label>
                        <input
                          type="text"
                          value={form.warrantyProvider}
                          onChange={(e) => setForm((f) => ({ ...f, warrantyProvider: e.target.value }))}
                          placeholder="e.g., AutoCare"
                          style={{
                            width: '100%', padding: '0.75rem 1rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'Outfit', marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={form.mechInsuranceIncluded}
                      onChange={(e) => setForm((f) => ({ ...f, mechInsuranceIncluded: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{color: "#0D1B2A", fontSize: '0.875rem' }}>Mechanical Insurance</span>
                  </label>
                  {form.mechInsuranceIncluded && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginLeft: '1.5rem' }}>
                      <div>
                        <label style={{
                          display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                          color: '#767676', letterSpacing: '0.1em',
                          textTransform: 'uppercase', marginBottom: '0.5rem',
                        }}>
                          Months
                        </label>
                        <select
                          value={form.mechInsuranceMonths}
                          onChange={(e) => setForm((f) => ({ ...f, mechInsuranceMonths: Number(e.target.value) as any }))}
                          style={{
                            width: '100%', padding: '0.75rem 1rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem',
                          }}
                        >
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                        </select>
                      </div>
                      <div>
                        <label style={{
                          display: 'block', fontFamily: 'Outfit', fontSize: '0.7rem',
                          color: '#767676', letterSpacing: '0.1em',
                          textTransform: 'uppercase', marginBottom: '0.5rem',
                        }}>
                          Provider
                        </label>
                        <input
                          type="text"
                          value={form.mechInsuranceProvider}
                          onChange={(e) => setForm((f) => ({ ...f, mechInsuranceProvider: e.target.value }))}
                          placeholder="e.g., InsureMe"
                          style={{
                            width: '100%', padding: '0.75rem 1rem', borderRadius: 0,
                            backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
                            color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem', outline: 'none',
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#1A1A1A'; e.currentTarget.style.borderBottomWidth = '2px' }}
                          onBlur={(e) => { e.currentTarget.style.borderBottomColor = '#E0E0DC'; e.currentTarget.style.borderBottomWidth = '1px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Grand Total Breakdown */}
          <div style={{
            backgroundColor: 'transparent', border: '1px solid rgba(255,158,11,0.15)',
            borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)',
          }}>
            <h4 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Grand Total Breakdown
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Vehicle Price</p>
                <p style={{color: "#0D1B2A" }}>{fmt(form.salePrice)}</p>
              </div>
              {!form.orcIncluded && orcTotal > 0 && (
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>ORC</p>
                  <p style={{color: "#0D1B2A" }}>{fmt(orcTotal)}</p>
                </div>
              )}
              {accessoriesTotal > 0 && (
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Accessories</p>
                  <p style={{color: "#0D1B2A" }}>{fmt(accessoriesTotal)}</p>
                </div>
              )}
              {financingFeesTotal > 0 && (
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Financing Fees</p>
                  <p style={{color: "#0D1B2A" }}>{fmt(financingFeesTotal)}</p>
                </div>
              )}
            </div>

            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>Subtotal</p>
                  <p style={{color: "#0D1B2A" }}>{fmt(subtotal)}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>GST (15%)</p>
                  <p style={{ fontFamily: 'Outfit', color: '#1A1A1A' }}>{fmt(gst)}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.5rem' }}>TOTAL</p>
              <p className="font-bebas" style={{ fontSize: '2rem', color: '#1A1A1A', lineHeight: 1 }}>{fmt(totalCostToBuyer)}</p>
            </div>
          </div>

          {/* Payment Calculator */}
          {form.paymentType !== 'cash' && (
            <div style={{
              background: 'linear-gradient(135deg, #E4EAF0, #FFFFFF)', border: '1px solid rgba(29,78,216,0.2)',
              borderRadius: '1rem', padding: 'clamp(0.75rem, 2vw, 1.5rem)', marginBottom: 'clamp(1rem, 3vw, 2rem)',
            }}>
              <h4 style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', marginBottom: '1rem' }}>
                Payment Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(0.75rem, 2vw, 1rem)', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Amount Financed</p>
                  <p style={{color: "#0D1B2A" }}>{fmt(calc.financedAmount)}</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Total Interest</p>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.95rem', color: '#ef4444' }}>{fmt(calc.totalInterest)}</p>
                </div>
              </div>
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '0.75rem', padding: '1rem',
                border: '1px solid rgba(29,78,216,0.1)',
              }}>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.5rem' }}>Monthly Payment</p>
                <p className="font-bebas" style={{ fontSize: '2rem', color: '#1A1A1A', lineHeight: 1 }}>{fmt(calc.monthlyPayment)}</p>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676', marginBottom: '0.25rem' }}>Total Repayment</p>
                <p style={{color: "#0D1B2A" }}>{fmt(calc.totalPayment)}</p>
              </div>
            </div>
          )}

          {/* Documents & Photos - Unified Upload */}
          <div style={{ marginBottom: '2rem' }}>
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
                id="unified-upload"
              />
              <label htmlFor="unified-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                <Upload size={40} style={{ margin: '0 auto 1rem', color: '#1A1A1A' }} />
                <p style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>
                  Drop files here or click to browse
                </p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676' }}>
                  Images, PDFs, documents â€” all types accepted
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
                      backgroundColor: 'transparent',
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
                          backgroundColor: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1A1A1A',
                          fontSize: '2rem',
                        }}>
                          ðŸ“„
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
                        Ã—
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{
                        display: 'block',
                        padding: '0.5rem',
                        fontFamily: 'Outfit',
                        fontSize: '0.65rem',
                        color: '#1A1A1A',
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

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                color: "#0D1B2A", fontFamily: 'Outfit', cursor: 'pointer',
              }}
            >
              â† Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem', borderRadius: 0,
                background: '#1A1A1A',
                color: "#FFFFFF", fontFamily: 'Outfit', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                border: 'none', width: '100%', height: '52px',
              }}
            >
              {loading ? 'Saving...' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


