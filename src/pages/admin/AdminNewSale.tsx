import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminNewSale.css'
import {
  CheckCircle,
  CreditCard,
  DollarSign,
  Split,
  ChevronDown,
  X,
} from "lucide-react";
import { getCars } from "../../lib/carsService";
import { sanitizeDigits } from "../../lib/numericInput";
import { isValidNZLicence, normalizeLicenceInput } from "../../lib/financingValidation";
import {
  generatePaymentSchedule,
  getSales,
  getSoldCarIds,
  type Buyer,
  type PaymentPlan,
  type PaymentRecord,
  type VehicleInfo,
  type ORC,
  type ExtraAccessories,
  type FinancingFees,
  type Warranty,
  type MechanicalInsurance,
} from "../../lib/salesService";
import { createSale, deleteCloudinaryFile, type AdminSalePayload } from "../../lib/adminSalesService";
import { uploadSalesDocument } from "../../lib/cloudinaryService";
import { showToast } from "../../lib/toast";
import { useUserRole } from "../../hooks/useUserRole";
import type { Car } from "../../types";
import type { FormData } from "../../types/saleForm";
import { VehicleSelectionStep } from "../../components/admin/sales/new-sale/VehicleSelectionStep";
import { BuyerInformationStep } from "../../components/admin/sales/new-sale/BuyerInformationStep";
import { OrcSection } from "../../components/admin/sales/new-sale/OrcSection";
import { DocumentsUploadSection } from "../../components/admin/sales/new-sale/DocumentsUploadSection";

// Formats a number as NZD currency for display
function fmt(price: number) {
  return price.toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

// Multi-step admin form for recording a new vehicle sale - collects vehicle, buyer, and payment details,
// uploads supporting documents to Cloudinary, and saves the completed sale record to Firestore
export default function AdminNewSale() {
  const navigate = useNavigate();
  const { isDemo } = useUserRole();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cars, setCars] = useState<Car[]>([]);
  // Tracks which document URLs currently have a Cloudinary deletion in flight, so Remove can be
  // disabled per-item and repeated clicks can't fire overlapping delete requests.
  const [deletingFileUrls, setDeletingFileUrls] = useState<Set<string>>(new Set());
  const [soldCarIds, setSoldCarIds] = useState<Set<string>>(new Set());
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [carsOpen, setCarsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormData>(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      carId: "",
      vin: "",
      plate: "",
      isNZNew: true,
      originCountry: "Japan",
      previousOwners: 0,
      hasMaintenanceHistory: false,
      buyerName: "",
      buyerIdNumber: "",
      buyerLicense: "",
      buyerEmail: "",
      buyerPhone: "",
      buyerAddress: "",
      saleDate: now.toISOString().split("T")[0],
      paymentType: "cash",
      salePrice: 0,
      downPayment: 0,
      loanTerm: 24,
      firstPaymentDate: thirtyDaysLater.toISOString().split("T")[0],
    notes: "",
    orcIncluded: false,
    driveAwayPrice: false,
    orcWof: 0,
    orcRegistration: 0,
    orcRegistrationMonths: 6,
    orcGrooming: 0,
    orcOwnershipTransfer: 0,
    orcMechanicalInspection: 0,
    orcOtherLabel: "",
    orcOtherAmount: 0,
    accessories: [],
    ffEstablishment: 0,
    ffPpsr: 10,
    ffMonthlyAccount: 0,
    ffDealerOrigination: 0,
    warrantyIncluded: false,
    warrantyMonths: 3,
    warrantyProvider: "",
    mechInsuranceIncluded: false,
    mechInsuranceMonths: 3,
    mechInsuranceProvider: "",
    uploadingFiles: new Map(),
    uploadedDocuments: [],
    };
  });
  const [orcExpanded, setOrcExpanded] = useState(false);
  const [accessoriesExpanded, setAccessoriesExpanded] = useState(false);
  const [financingFeesExpanded, setFinancingFeesExpanded] = useState(false);
  const [warrantyExpanded, setWarrantyExpanded] = useState(false);

  // Fetches the full car inventory from Firestore on mount and pre-selects a car if one was already chosen
  useEffect(() => {
    getCars().then((data) => {
      setCars(data);
      if (form.carId) {
        const car = data.find((c) => c.id === form.carId);
        setSelectedCar(car || null);
      }
    });
  }, [form.carId]);

  // Determines which cars are already sold (any non-cancelled sale referencing that carId), so they
  // can be excluded from the vehicle picker below - the same Toyota Corolla shouldn't be selectable
  // for a second sale once it's already been sold.
  useEffect(() => {
    getSales().then((existingSales) => {
      setSoldCarIds(getSoldCarIds(existingSales));
    });
  }, []);

  // Syncs the sale price field with the selected car's listed price whenever the selection changes
  // setState in effect is intentional: when user selects a different car, we update the form's salePrice
  useEffect(() => {
    if (selectedCar) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((f) => ({ ...f, salePrice: selectedCar.price }));
    }
  }, [selectedCar]);

  const availableCars = useMemo(
    () => cars.filter((c) => !soldCarIds.has(c.id)),
    [cars, soldCarIds],
  );

  const filteredCars = useMemo(() => {
    if (!searchInput) return availableCars;
    const q = searchInput.toLowerCase();
    return availableCars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q),
    );
  }, [availableCars, searchInput]);

  const monthlyRate = 0.008;
  // Calculates monthly payment, total payment, and total interest for the selected payment type (cash/financing/mixed)
  const calc = useMemo(() => {
    if (form.paymentType === "cash") {
      return {
        monthlyPayment: 0,
        totalPayment: form.salePrice,
        totalInterest: 0,
        financedAmount: 0,
      };
    }
    const financed =
      form.paymentType === "mixed"
        ? form.salePrice - form.downPayment
        : form.salePrice;
    const rate = monthlyRate;
    const months = form.loanTerm;
    const monthlyPayment =
      (financed * (rate * (1 + rate) ** months)) / ((1 + rate) ** months - 1);
    const totalPayment = monthlyPayment * months + form.downPayment;
    const totalInterest = totalPayment - form.salePrice;
    return {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalPayment,
      totalInterest: Math.round(totalInterest * 100) / 100,
      financedAmount: financed,
    };
  }, [form.paymentType, form.salePrice, form.downPayment, form.loanTerm]);

  // Validates whether the current step's required fields are filled before allowing navigation to the next step
  const canNext = () => {
    if (step === 1)
      return !!selectedCar && !!form.vin.trim() && !!form.plate.trim();
    if (step === 2) {
      return !!(
        form.buyerName &&
        form.buyerIdNumber &&
        form.buyerLicense &&
        form.buyerEmail &&
        form.buyerPhone &&
        form.buyerAddress &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyerEmail) &&
        isValidNZLicence(form.buyerLicense.trim().toUpperCase())
      );
    }
    return true;
  };

  const orcTotal = form.orcIncluded
    ? 0
    : form.orcWof +
      form.orcRegistration +
      form.orcGrooming +
      form.orcOwnershipTransfer +
      form.orcMechanicalInspection +
      form.orcOtherAmount;
  const accessoriesTotal = form.accessories.reduce(
    (sum, a) => sum + a.price,
    0,
  );
  const financingFeesTotal =
    form.paymentType === "cash"
      ? 0
      : form.ffEstablishment +
        form.ffPpsr +
        form.ffMonthlyAccount +
        form.ffDealerOrigination;
  const subtotal =
    form.salePrice + orcTotal + accessoriesTotal + financingFeesTotal;
  const gst = Math.round(subtotal * 0.15);
  const totalCostToBuyer = subtotal + gst;

  // Uploads selected/dropped files (images or PDFs) to Cloudinary one by one, tracking per-file progress in form state
  const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES = 10;

  const handleFilesSelected = async (files: FileList) => {
    const candidates = Array.from(files);
    const existingCount = form.uploadedDocuments.length + form.uploadingFiles.size;
    const slotsLeft = Math.max(0, MAX_FILES - existingCount);

    if (candidates.length > slotsLeft) {
      showToast(`You can upload up to ${MAX_FILES} files total`, "error");
    }

    const newFiles: File[] = [];
    for (const file of candidates) {
      if (newFiles.length >= slotsLeft) break;
      if (file.size === 0) {
        showToast(`${file.name} is empty and was skipped`, "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name} exceeds the 10MB limit`, "error");
        continue;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        showToast(`${file.name} is not a supported file type (JPEG, PNG, WebP, PDF only)`, "error");
        continue;
      }
      newFiles.push(file);
    }

    if (newFiles.length === 0) return;

    const fileIds = newFiles.map((file) => `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const newUploading = new Map(form.uploadingFiles);

    newFiles.forEach((file, i) => {
      newUploading.set(fileIds[i], { file, progress: 0, uploaded: false });
    });

    setForm((f) => ({ ...f, uploadingFiles: newUploading }));

    // Upload each file immediately
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const fileId = fileIds[i];
      try {
        const uploaded = await uploadSalesDocument(file, "sales");

        setForm((f) => {
          const updated = new Map(f.uploadingFiles);
          updated.set(fileId, {
            ...updated.get(fileId)!,
            progress: 100,
            uploaded: true,
          });
          return {
            ...f,
            uploadingFiles: updated,
            uploadedDocuments: [
              ...f.uploadedDocuments,
              { url: uploaded.url, publicId: uploaded.publicId, resourceType: uploaded.resourceType, filename: file.name, mimeType: file.type },
            ],
          };
        });

        // Remove from uploading list after 1 second
        setTimeout(() => {
          setForm((f) => {
            const updated = new Map(f.uploadingFiles);
            updated.delete(fileId);
            return { ...f, uploadingFiles: updated };
          });
        }, 1000);
      } catch (err) {
        console.error("File upload error:", err);
        showToast(err instanceof Error ? err.message : "Failed to upload file", "error");
        setForm((f) => {
          const updated = new Map(f.uploadingFiles);
          updated.delete(fileId);
          return { ...f, uploadingFiles: updated };
        });
      }
    }
  };

  // Removes a previously uploaded (not yet saved) document/image. Cloudinary deletion is
  // confirmed BEFORE the reference is removed from form state - every file here was just
  // uploaded during this session, so it always has a publicId (never a legacy string-only entry).
  // If deletion fails, the file is kept in the list so the user can retry rather than silently
  // losing track of an asset that still exists in Cloudinary.
  const handleRemoveFile = async (url: string) => {
    if (isDemo) {
      showToast('Demo mode: deleting data is disabled.', 'error');
      return;
    }
    if (deletingFileUrls.has(url)) return; // already in flight - ignore repeated clicks
    const doc = form.uploadedDocuments.find((d) => d.url === url);
    if (!doc?.publicId) {
      // No publicId to delete (shouldn't normally happen for a same-session upload) - just drop the reference.
      setForm((f) => ({ ...f, uploadedDocuments: f.uploadedDocuments.filter((d) => d.url !== url) }));
      return;
    }

    setDeletingFileUrls((prev) => new Set(prev).add(url));
    try {
      const result = await deleteCloudinaryFile(doc.publicId, doc.resourceType);
      if (!result.success) {
        showToast(result.error || "Failed to delete file from Cloudinary - the file was kept so you can retry", "error");
        return;
      }
      setForm((f) => ({ ...f, uploadedDocuments: f.uploadedDocuments.filter((d) => d.url !== url) }));
    } finally {
      setDeletingFileUrls((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  // Assembles the full sale record (buyer, vehicle, payment plan, ORC, fees, warranty, documents) from form state,
  // sanitizes it, and saves it to Firestore, then redirects to the new sale's detail page
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCar) return;
    setLoading(true);
    try {
      const buyer: Buyer = {
        name: form.buyerName.trim(),
        idNumber: form.buyerIdNumber.trim(),
        email: form.buyerEmail.trim(),
        phone: form.buyerPhone.trim(),
        address: form.buyerAddress.trim(),
        licenseNumber: normalizeLicenceInput(form.buyerLicense),
      };

      let payments: PaymentRecord[] = [];
      const paymentPlan: PaymentPlan = {
        type: form.paymentType,
        salePrice: form.salePrice,
        downPayment: form.paymentType === "cash" ? 0 : form.downPayment,
        financedAmount: calc.financedAmount,
        monthlyRate: monthlyRate * 100,
        termMonths: form.loanTerm,
        monthlyPayment: calc.monthlyPayment,
        totalPayment: calc.totalPayment,
        totalInterest: calc.totalInterest,
        firstPaymentDate: form.firstPaymentDate,
      };

      if (form.paymentType !== "cash") {
        payments = generatePaymentSchedule(
          calc.financedAmount,
          form.loanTerm,
          monthlyRate * 100,
          form.firstPaymentDate,
        );
      }

      const vehicleInfo: VehicleInfo = {
        vin: form.vin,
        plate: form.plate,
        isNZNew: form.isNZNew,
        originCountry: form.originCountry,
        previousOwners: Number(form.previousOwners) || 0,
        hasMaintenanceHistory: form.hasMaintenanceHistory,
      };

      const orc: ORC = {
        wof: Number(form.orcWof) || 0,
        registration: Number(form.orcRegistration) || 0,
        registrationMonths: form.orcRegistrationMonths,
        grooming: Number(form.orcGrooming) || 0,
        ownershipTransfer: Number(form.orcOwnershipTransfer) || 0,
        mechanicalInspection: Number(form.orcMechanicalInspection) || 0,
        otherLabel: form.orcOtherLabel || "",
        otherAmount: Number(form.orcOtherAmount) || 0,
        orcTotal: orcTotal,
        orcIncluded: form.orcIncluded,
        driveAwayPrice: form.driveAwayPrice,
      };

      const extraAccessories: ExtraAccessories = {
        items: form.accessories,
        total: accessoriesTotal,
      };

      const financingFees: FinancingFees | undefined =
        form.paymentType !== "cash"
          ? {
              establishmentFee: Number(form.ffEstablishment) || 0,
              ppsr: Number(form.ffPpsr) || 0,
              monthlyAccountFee: Number(form.ffMonthlyAccount) || 0,
              dealerOriginationFee: Number(form.ffDealerOrigination) || 0,
              total: financingFeesTotal,
            }
          : undefined;

      const warranty: Warranty | undefined = form.warrantyIncluded
        ? {
            included: true,
            months: Number(form.warrantyMonths) || 3,
            provider: form.warrantyProvider,
          }
        : undefined;

      const mechanicalInsurance: MechanicalInsurance | undefined =
        form.mechInsuranceIncluded
          ? {
              included: true,
              months: Number(form.mechInsuranceMonths) || 3,
              provider: form.mechInsuranceProvider,
            }
          : undefined;

      const saleStatus = form.paymentType === "cash" ? "completed" : "active";

      const salePayload: AdminSalePayload = {
        // The backend validator requires salePrice as a top-level payload property (see
        // validateSalePayload in src/lib/validators.js) - it is also duplicated under
        // paymentPlan.salePrice below because that is where the Sales list/detail pages read
        // it from. Both must always come from the same form.salePrice value.
        salePrice: form.salePrice,
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
        documents: {
          uploadedDocuments: form.uploadedDocuments,
        },
      };

      const result = await createSale(salePayload);
      if (!result.success) {
        showToast(result.error || 'Failed to save sale', 'error');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        navigate(`/admin/sales/${result.id}`);
      }, 2000);
    } catch (err) {
      console.error("Submit failed:", err);
      showToast("Failed to save sale", "error");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="admin-new-sale__success-container">
        <CheckCircle
          size={64}
          color="#22c55e"
          className="admin-new-sale__success-icon"
        />
        <h2 className="font-bebas admin-new-sale__success-heading">
          Sale Recorded!
        </h2>
        <p className="admin-new-sale__success-message">
          {selectedCar?.title} sold to {form.buyerName} for{" "}
          {fmt(form.salePrice)}. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form className="admin-new-sale__form" onSubmit={handleSubmit}>
      {/* Step indicator */}
      <div className="admin-new-sale__step-indicator">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="admin-new-sale__step-item">
            <div
              className={`admin-new-sale__step-circle ${
                s < step
                  ? "admin-new-sale__step-circle--completed"
                  : s === step
                    ? "admin-new-sale__step-circle--active"
                    : "admin-new-sale__step-circle--inactive"
              }`}>
              {s < step ? <CheckCircle size={20} /> : s}
            </div>
            <span
              className={`admin-new-sale__step-label font-bebas ${
                s === step
                  ? "admin-new-sale__step-label--active"
                  : "admin-new-sale__step-label--inactive"
              }`}>
              {s === 1 ? "Vehicle" : s === 2 ? "Buyer" : "Payment"}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Vehicle */}
      {step === 1 && (
        <VehicleSelectionStep
          selectedCar={selectedCar}
          searchInput={searchInput}
          filteredCars={filteredCars}
          carsOpen={carsOpen}
          form={form}
          onSearchChange={setSearchInput}
          onCarsOpenChange={setCarsOpen}
          onCarSelect={setSelectedCar}
          onCarDeselect={() => {
            setSelectedCar(null);
            setForm((f) => ({ ...f, carId: "" }));
          }}
          onFormChange={setForm}
          canNext={canNext()}
          onNext={() => setStep(2)}
          onCancel={() => navigate("/admin/sales")}
        />
      )}
      {step === 2 && (
        <BuyerInformationStep
          form={form}
          onFormChange={setForm}
          canNext={canNext()}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {/* Step 3: Payment Plan */}
      {step === 3 && selectedCar && (
        <div>
          <h2 className="font-bebas admin-new-sale__page-heading">
            Payment Plan
          </h2>

          <div className="admin-new-sale__field-group">
            <label htmlFor="sale-date" className="admin-new-sale__label">
              Sale Date *
            </label>
            <input
              id="sale-date"
              type="date"
              value={form.saleDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, saleDate: e.target.value }))
              }
              className="admin-new-sale__field"
            />
          </div>

          <div className="admin-new-sale__field-group">
            <label id="payment-type-label" className="admin-new-sale__label">
              Payment Type *
            </label>
            <div
              className="admin-new-sale__payment-type"
              role="group"
              aria-labelledby="payment-type-label">
              {[
                {
                  type: "cash" as const,
                  icon: DollarSign,
                  title: "Cash",
                  desc: "Full payment upfront",
                },
                {
                  type: "financing" as const,
                  icon: CreditCard,
                  title: "Financing",
                  desc: "Monthly installments",
                },
                {
                  type: "mixed" as const,
                  icon: Split,
                  title: "Mixed",
                  desc: "Down payment + finance",
                },
              ].map(({ type, icon: Icon, title, desc }) => (
                <div
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, paymentType: type }))}
                  className={`admin-new-sale__payment-card ${
                    form.paymentType === type ? "admin-new-sale__payment-card--selected" : ""
                  }`}>
                  <Icon
                    size={24}
                    style={{
                      color: form.paymentType === type ? "#1A1A1A" : "rgba(255,255,255,0.3)"
                    }}
                    className="admin-new-sale__payment-card-icon"
                  />
                  <p className="font-bebas admin-new-sale__payment-card-title">
                    {title}
                  </p>
                  <p className="admin-new-sale__payment-card-desc">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Financing fields */}
          {form.paymentType !== "cash" && (
            <div className="admin-new-sale__financing-section">
              <div className="admin-new-sale__field-group">
                <label htmlFor="sale-price" className="admin-new-sale__label">
                  Sale Price (NZD) *
                </label>
                <input
                  id="sale-price"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={form.salePrice === 0 ? '' : String(form.salePrice)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      salePrice: Number(sanitizeDigits(e.target.value, 7)) || 0,
                    }))
                  }
                  className="admin-new-sale__field"
                />
              </div>

              {form.paymentType === "mixed" && (
                <div className="admin-new-sale__field-group">
                  <label htmlFor="down-payment" className="admin-new-sale__label">
                    Down Payment (NZD) *
                  </label>
                  <input
                    id="down-payment"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={7}
                    value={form.downPayment === 0 ? '' : String(form.downPayment)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        downPayment: Number(sanitizeDigits(e.target.value, 7)) || 0,
                      }))
                    }
                    className="admin-new-sale__field"
                  />
                </div>
              )}

              <div className="admin-new-sale__field-group">
                <label className="admin-new-sale__label admin-new-sale__label--large">
                  Loan Term (months) *
                </label>
                <div className="admin-new-sale__term-buttons">
                  {[12, 24, 36, 48, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, loanTerm: m }))}
                      aria-pressed={form.loanTerm === m}
                      aria-label={`${m} month loan term`}
                      className={`admin-new-sale__button--term ${
                        form.loanTerm === m
                          ? "admin-new-sale__button--term--active"
                          : "admin-new-sale__button--term--inactive"
                      }`}>
                      {m} mo
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-new-sale__field-group">
                <label htmlFor="first-payment-date" className="admin-new-sale__label">
                  First Payment Date *
                </label>
                <input
                  id="first-payment-date"
                  type="date"
                  value={form.firstPaymentDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstPaymentDate: e.target.value }))
                  }
                  className="admin-new-sale__field"
                />
              </div>

              <div className="admin-new-sale__rate-info">
                <p>
                  Fixed monthly rate:{" "}
                  <strong className="admin-new-sale__rate-info-highlight">0.8%</strong>
                </p>
              </div>
            </div>
          )}

          {/* Sale Price for cash */}
          {form.paymentType === "cash" && (
            <div className="admin-new-sale__field-group">
              <label
                htmlFor="sale-price-cash"
                className="admin-new-sale__label">
                Sale Price (NZD) *
              </label>
              <input
                id="sale-price-cash"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                value={form.salePrice === 0 ? '' : String(form.salePrice)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salePrice: Number(sanitizeDigits(e.target.value, 7)) || 0 }))
                }
                className="admin-new-sale__field"
              />
            </div>
          )}

          {/* Notes */}
          <div className="admin-new-sale__field-group">
            <label
              className="admin-new-sale__label">
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Add any notes about this sale..."
              className="admin-new-sale__textarea"
            />
          </div>

          <OrcSection
            form={form}
            expanded={orcExpanded}
            orcTotal={orcTotal}
            onToggle={() => setOrcExpanded(!orcExpanded)}
            onFormChange={setForm}
          />

          {/* SECTION B: Extra Accessories */}
          <div
            className="admin-new-sale__section">
            <button
              type="button"
              onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
              className="admin-new-sale__section-header">
              <div>
                Extra Accessories / Add-ons (Optional)
                <p
                  className="admin-new-sale__section-subtitle">
                  Additional items installed or included with the vehicle
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`admin-new-sale__chevron ${accessoriesExpanded ? 'admin-new-sale__chevron--expanded' : ''}`}
              />
            </button>
            {accessoriesExpanded && (
              <div
                className="admin-new-sale__section-body">
                <div
                  className="admin-new-sale__accessories-list">
                  {form.accessories.map((item, idx) => (
                    <div
                      key={idx}
                      className="admin-new-sale__accessory-row">
                      <div>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newAccessories = [...form.accessories];
                            newAccessories[idx].description = e.target.value;
                            setForm((f) => ({
                              ...f,
                              accessories: newAccessories,
                            }));
                          }}
                          placeholder="e.g., Roof Rack"
                          className="admin-new-sale__field"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={item.price === 0 ? '' : String(item.price)}
                          onChange={(e) => {
                            const newAccessories = [...form.accessories];
                            newAccessories[idx].price =
                              Number(sanitizeDigits(e.target.value, 6)) || 0;
                            setForm((f) => ({
                              ...f,
                              accessories: newAccessories,
                            }));
                          }}
                          placeholder="0"
                          className="admin-new-sale__field"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newAccessories = form.accessories.filter(
                            (_, i) => i !== idx,
                          );
                          setForm((f) => ({
                            ...f,
                            accessories: newAccessories,
                          }));
                        }}
                        className="admin-new-sale__accessory-remove">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      accessories: [
                        ...f.accessories,
                        { description: "", price: 0 },
                      ],
                    }))
                  }
                  className="admin-new-sale__add-item-button">
                  + Add Item
                </button>

                <div
                  className="admin-new-sale__accessories-total">
                  <p
                    className="admin-new-sale__summary-label">
                    Accessories Total
                  </p>
                  <p
                    className="font-bebas admin-new-sale__accessories-total-value">
                    {fmt(accessoriesTotal)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION C: Financing Fees (only if not cash) */}
          {form.paymentType !== "cash" && (
            <div
              className="admin-new-sale__section">
              <button
                type="button"
                onClick={() => setFinancingFeesExpanded(!financingFeesExpanded)}
                className="admin-new-sale__section-header">
                <div>
                  Financing Fees
                  <p
                    className="admin-new-sale__section-subtitle">
                    Standard NZ financing costs
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`admin-new-sale__chevron ${financingFeesExpanded ? 'admin-new-sale__chevron--expanded' : ''}`}
                />
              </button>
              {financingFeesExpanded && (
                <div
                  className="admin-new-sale__section-body">
                  <div
                    className="admin-new-sale__grid">
                    <div>
                      <label
                        className="admin-new-sale__label">
                        Establishment Fee (NZD)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                        value={form.ffEstablishment === 0 ? '' : String(form.ffEstablishment)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ffEstablishment: Number(sanitizeDigits(e.target.value, 5)) || 0,
                          }))
                        }
                        placeholder="380"
                        className="admin-new-sale__field"
                      />
                      <p
                        className="admin-new-sale__helper-text">
                        Typically NZ$150–500
                      </p>
                    </div>

                    <div>
                      <label
                        className="admin-new-sale__label">
                        PPSR Fee (NZD)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={form.ffPpsr === 0 ? '' : String(form.ffPpsr)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ffPpsr: Number(sanitizeDigits(e.target.value, 4)) || 0,
                          }))
                        }
                        placeholder="10"
                        className="admin-new-sale__field"
                      />
                      <p
                        className="admin-new-sale__helper-text">
                        Personal Property Securities Register ~$10
                      </p>
                    </div>

                    <div>
                      <label
                        className="admin-new-sale__label">
                        Monthly Account Fee (NZD)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={form.ffMonthlyAccount === 0 ? '' : String(form.ffMonthlyAccount)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ffMonthlyAccount: Number(sanitizeDigits(e.target.value, 4)) || 0,
                          }))
                        }
                        placeholder="5"
                        className="admin-new-sale__field"
                      />
                      <p
                        className="admin-new-sale__helper-text">
                        Monthly admin fee
                      </p>
                    </div>

                    <div>
                      <label
                        className="admin-new-sale__label">
                        Dealer Origination Fee (NZD)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={5}
                        value={form.ffDealerOrigination === 0 ? '' : String(form.ffDealerOrigination)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ffDealerOrigination: Number(sanitizeDigits(e.target.value, 5)) || 0,
                          }))
                        }
                        placeholder="350"
                        className="admin-new-sale__field"
                      />
                      <p
                        className="admin-new-sale__helper-text">
                        Typically NZ$350–500
                      </p>
                    </div>
                  </div>

                  <div
                    className="admin-new-sale__financing-fees-total">
                    <p
                      className="admin-new-sale__summary-label">
                      Financing Fees Total
                    </p>
                    <p
                      className="font-bebas admin-new-sale__financing-fees-total-value">
                      {fmt(financingFeesTotal)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION D: Warranty & Insurance */}
          <div
            className="admin-new-sale__section">
            <button
              type="button"
              onClick={() => setWarrantyExpanded(!warrantyExpanded)}
              className="admin-new-sale__section-header">
              <div>Warranty & Insurance (Optional)</div>
              <ChevronDown
                size={16}
                className={`admin-new-sale__chevron ${warrantyExpanded ? 'admin-new-sale__chevron--expanded' : ''}`}
              />
            </button>
            {warrantyExpanded && (
              <div
                className="admin-new-sale__section-body">
                <div className="admin-new-sale__field-group">
                  <label
                    className="admin-new-sale__warranty-checkbox">
                    <input
                      type="checkbox"
                      checked={form.warrantyIncluded}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          warrantyIncluded: e.target.checked,
                        }))
                      }
                    />
                    <span className="admin-new-sale__warranty-checkbox-text">
                      Mechanical Warranty
                    </span>
                  </label>
                  {form.warrantyIncluded && (
                    <div
                      className="admin-new-sale__mechanic-insurance-fields">
                      <div>
                        <label
                          className="admin-new-sale__label">
                          Months
                        </label>
                        <select
                          value={form.warrantyMonths}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              warrantyMonths: Number(e.target.value),
                            }))
                          }
                          className="admin-new-sale__field">
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className="admin-new-sale__label">
                          Provider
                        </label>
                        <input
                          type="text"
                          value={form.warrantyProvider}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              warrantyProvider: e.target.value,
                            }))
                          }
                          placeholder="e.g., AutoCare"
                          className="admin-new-sale__field"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    className="admin-new-sale__warranty-checkbox">
                    <input
                      type="checkbox"
                      checked={form.mechInsuranceIncluded}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          mechInsuranceIncluded: e.target.checked,
                        }))
                      }
                    />
                    <span className="admin-new-sale__warranty-checkbox-text">
                      Mechanical Insurance
                    </span>
                  </label>
                  {form.mechInsuranceIncluded && (
                    <div
                      className="admin-new-sale__mechanic-insurance-fields">
                      <div>
                        <label
                          className="admin-new-sale__label">
                          Months
                        </label>
                        <select
                          value={form.mechInsuranceMonths}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              mechInsuranceMonths: Number(e.target.value),
                            }))
                          }
                          className="admin-new-sale__field">
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className="admin-new-sale__label">
                          Provider
                        </label>
                        <input
                          type="text"
                          value={form.mechInsuranceProvider}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              mechInsuranceProvider: e.target.value,
                            }))
                          }
                          placeholder="e.g., InsureMe"
                          className="admin-new-sale__field"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Grand Total Breakdown */}
          <div className="admin-new-sale__summary-card">
            <h4 className="admin-new-sale__payment-calculator-title">
              Grand Total Breakdown
            </h4>
            <div className="admin-new-sale__summary-row">
              <div className="admin-new-sale__summary-item">
                <p className="admin-new-sale__summary-label">
                  Vehicle Price
                </p>
                <p className="admin-new-sale__summary-value">{fmt(form.salePrice)}</p>
              </div>
              {!form.orcIncluded && orcTotal > 0 && (
                <div className="admin-new-sale__summary-item">
                  <p className="admin-new-sale__summary-label">
                    ORC
                  </p>
                  <p className="admin-new-sale__summary-value">{fmt(orcTotal)}</p>
                </div>
              )}
              {accessoriesTotal > 0 && (
                <div className="admin-new-sale__summary-item">
                  <p className="admin-new-sale__summary-label">
                    Accessories
                  </p>
                  <p className="admin-new-sale__summary-value">{fmt(accessoriesTotal)}</p>
                </div>
              )}
              {financingFeesTotal > 0 && (
                <div className="admin-new-sale__summary-item">
                  <p className="admin-new-sale__summary-label">
                    Financing Fees
                  </p>
                  <p className="admin-new-sale__summary-value">{fmt(financingFeesTotal)}</p>
                </div>
              )}
            </div>

            <div className="admin-new-sale__summary-divider">
              <div className="admin-new-sale__summary-row">
                <div className="admin-new-sale__summary-item">
                  <p className="admin-new-sale__summary-label">
                    Subtotal
                  </p>
                  <p className="admin-new-sale__summary-value">{fmt(subtotal)}</p>
                </div>
                <div className="admin-new-sale__summary-item">
                  <p className="admin-new-sale__summary-label">
                    GST (15%)
                  </p>
                  <p className="admin-new-sale__summary-value">
                    {fmt(gst)}
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-new-sale__summary-total">
              <p className="admin-new-sale__summary-total-label">
                TOTAL
              </p>
              <p className="font-bebas admin-new-sale__summary-total-value">
                {fmt(totalCostToBuyer)}
              </p>
            </div>
          </div>

          {/* Payment Calculator */}
          {form.paymentType !== "cash" && (
            <div className="admin-new-sale__payment-calculator">
              <h4 className="admin-new-sale__payment-calculator-title">
                Payment Summary
              </h4>
              <div className="admin-new-sale__payment-summary-grid">
                <div className="admin-new-sale__payment-summary-item">
                  <p className="admin-new-sale__payment-summary-label">
                    Amount Financed
                  </p>
                  <p className="admin-new-sale__payment-summary-value">{fmt(calc.financedAmount)}</p>
                </div>
                <div className="admin-new-sale__payment-summary-item">
                  <p className="admin-new-sale__payment-summary-label">
                    Total Interest
                  </p>
                  <p className="admin-new-sale__payment-summary-interest">
                    {fmt(calc.totalInterest)}
                  </p>
                </div>
              </div>
              <div className="admin-new-sale__payment-highlight">
                <p className="admin-new-sale__payment-highlight-label">
                  Monthly Payment
                </p>
                <p className="font-bebas admin-new-sale__payment-highlight-value">
                  {fmt(calc.monthlyPayment)}
                </p>
              </div>
              <div className="admin-new-sale__payment-highlight-footer">
                <p className="admin-new-sale__payment-summary-label">
                  Total Repayment
                </p>
                <p className="admin-new-sale__payment-summary-value">{fmt(calc.totalPayment)}</p>
              </div>
            </div>
          )}

          <DocumentsUploadSection
            form={form}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            deletingUrls={deletingFileUrls}
          />

          <div className="admin-new-sale__button-group">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="admin-new-sale__button admin-new-sale__button--secondary">
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="admin-new-sale__button admin-new-sale__button--primary">
              {loading ? "Saving..." : "Confirm Sale"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}


