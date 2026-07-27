import { Search, ArrowRight } from 'lucide-react'
import { formatNZD } from '../../../../lib/formatting'
import { sanitizeDigits } from '../../../../lib/numericInput'
import type { Car } from '../../../../types'
import type { FormData } from '../../../../types/saleForm'
import { FormInputField } from '../FormInputField'

interface VehicleSelectionStepProps {
  selectedCar: Car | null
  searchInput: string
  filteredCars: Car[]
  carsOpen: boolean
  form: FormData
  onSearchChange: (value: string) => void
  onCarsOpenChange: (open: boolean) => void
  onCarSelect: (car: Car) => void
  onCarDeselect: () => void
  onFormChange: (updater: (f: FormData) => FormData) => void
  canNext: boolean
  onNext: () => void
  onCancel: () => void
}

export function VehicleSelectionStep({
  selectedCar,
  searchInput,
  filteredCars,
  carsOpen,
  form,
  onSearchChange,
  onCarsOpenChange,
  onCarSelect,
  onCarDeselect,
  onFormChange,
  canNext,
  onNext,
  onCancel,
}: VehicleSelectionStepProps) {
  return (
    <div>
      <h2
        className="font-bebas admin-new-sale__page-heading">
        Select Vehicle
      </h2>
      <div className="admin-new-sale__search-wrapper">
        <Search
          size={18}
          className="admin-new-sale__search-icon"
        />
        <input
          type="text"
          placeholder="Search vehicles..."
          value={searchInput}
          maxLength={80}
          onChange={(e) => onSearchChange(e.target.value.slice(0, 80))}
          className="admin-new-sale__search-input"
          onFocus={() => onCarsOpenChange(true)}
          onBlur={() => {
            setTimeout(() => onCarsOpenChange(false), 200)
          }}
        />
        {carsOpen && (
          <div
            className="admin-new-sale__cars-dropdown">
            {filteredCars.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onCarSelect(c)
                  onFormChange((f) => ({ ...f, carId: c.id, salePrice: c.price }))
                  onCarsOpenChange(false)
                  onSearchChange('')
                }}
                className="admin-new-sale__car-item">
                <div
                  className="admin-new-sale__car-item-content">
                  <img
                    src={c.images[0]}
                    alt=""
                    className="admin-new-sale__car-item-image"
                  />
                  <div className="admin-new-sale__car-item-info">
                    <p className="font-bebas admin-new-sale__car-item-title">
                      {c.title}
                    </p>
                    <p
                      className="admin-new-sale__car-item-meta">
                      {c.year} • {c.km.toLocaleString()} km
                    </p>
                  </div>
                  <p
                    className="font-bebas admin-new-sale__car-item-price">
                    {formatNZD(c.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCar && (
        <>
          <div
            className="admin-new-sale__selected-car">
            <img
              src={selectedCar.images[0]}
              alt=""
              className="admin-new-sale__selected-car-image"
            />
            <h3
              className="font-bebas admin-new-sale__selected-car-title">
              {selectedCar.title}
            </h3>
            <div
              className="admin-new-sale__grid">
              <div>
                <p
                  className="admin-new-sale__summary-label">
                  Year • KM
                </p>
                <p className="admin-new-sale__summary-value">
                  {selectedCar.year} • {selectedCar.km.toLocaleString()} km
                </p>
              </div>
              <div>
                <p
                  className="admin-new-sale__summary-label">
                  Transmission • Fuel
                </p>
                <p className="admin-new-sale__summary-value">
                  {selectedCar.transmission} • {selectedCar.fuel}
                </p>
              </div>
            </div>
            <p
              className="font-bebas admin-new-sale__selected-car-price">
              {formatNZD(selectedCar.price)}
            </p>
            <button
              type="button"
              onClick={onCarDeselect}
              className="admin-new-sale__button--change-vehicle">
              Change Vehicle
            </button>
          </div>

          <div
            className="admin-new-sale__vehicle-details-card">
            <h3
              className="font-bebas admin-new-sale__vehicle-details-title">
              Vehicle Details *
            </h3>
            <div
              className="admin-new-sale__grid">
              <FormInputField
                label="VIN / Chassis Number"
                required
                placeholder="e.g. JTHBP5C1XA5034760"
                value={form.vin}
                maxLength={30}
                onChange={(e) =>
                  onFormChange((f) => ({
                    ...f,
                    vin: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9\- ]/g, '')
                      .replace(/[IOQ]/g, '')
                      .slice(0, 30),
                  }))
                }
              />
              <FormInputField
                label="License Plate"
                required
                placeholder="e.g. ABC123"
                value={form.plate}
                maxLength={10}
                onChange={(e) =>
                  onFormChange((f) => ({
                    ...f,
                    plate: e.target.value.toUpperCase().slice(0, 10),
                  }))
                }
              />
            </div>

            <div className="admin-new-sale__field-group">
              <label
                className="admin-new-sale__label">
                Vehicle Origin *
              </label>
              <div
                className="admin-new-sale__radio-group">
                <label
                  className="admin-new-sale__radio-option">
                  <input
                    type="radio"
                    checked={form.isNZNew}
                    onChange={() =>
                      onFormChange((f) => ({ ...f, isNZNew: true }))
                    }
                  />
                  <span>NZ New</span>
                </label>
                <label
                  className="admin-new-sale__radio-option">
                  <input
                    type="radio"
                    checked={!form.isNZNew}
                    onChange={() =>
                      onFormChange((f) => ({ ...f, isNZNew: false }))
                    }
                  />
                  <span>Used Import</span>
                </label>
              </div>
            </div>

            {!form.isNZNew && (
              <div className="admin-new-sale__field-group">
                <FormInputField
                  label="Country of Origin"
                  placeholder="e.g. Japan, Australia, USA"
                  value={form.originCountry}
                  maxLength={60}
                  onChange={(e) =>
                    onFormChange((f) => ({
                      ...f,
                      originCountry: e.target.value.slice(0, 60),
                    }))
                  }
                />
              </div>
            )}

            <div
              className="admin-new-sale__grid">
              <FormInputField
                label="Previous Owners"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={form.previousOwners === 0 ? '' : String(form.previousOwners)}
                onChange={(e) =>
                  onFormChange((f) => ({
                    ...f,
                    previousOwners: Math.max(0, Number(sanitizeDigits(e.target.value, 2)) || 0),
                  }))
                }
              />
              <div>
                <label
                  className="admin-new-sale__label">
                  Maintenance History
                </label>
                <div className="admin-new-sale__binary-buttons">
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange((f) => ({
                        ...f,
                        hasMaintenanceHistory: true,
                      }))
                    }
                    className={`admin-new-sale__binary-button ${form.hasMaintenanceHistory ? 'admin-new-sale__binary-button--active' : ''}`}>
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange((f) => ({
                        ...f,
                        hasMaintenanceHistory: false,
                      }))
                    }
                    className={`admin-new-sale__binary-button ${!form.hasMaintenanceHistory ? 'admin-new-sale__binary-button--active' : ''}`}>
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className="admin-new-sale__button-group">
        <button
          type="button"
          onClick={onCancel}
          className="admin-new-sale__button--outline">
          Cancel
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className={`admin-new-sale__button--primary ${!canNext ? 'admin-new-sale__button--primary--disabled' : ''}`}
          style={{
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.5,
          }}>
          Next Step
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
