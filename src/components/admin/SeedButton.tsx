import { useState } from 'react'
import { Upload } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { sanitizeForFirestore } from '../../lib/sanitize'
import carsCatalog from '../../data/cars-catalog.json'
import type { Car } from '../../types'

// Admin utility button that bulk-imports the static car catalog into Firestore, showing progress and status messages
export default function SeedButton() {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  // Writes each car from the local catalog JSON into the Firestore "cars" collection, sanitizing data first and overwriting existing entries
  const handleImport = async () => {
    if (importing) return
    if (!window.confirm(`Import ${carsCatalog.length} cars into Firestore? This will overwrite existing cars.`)) {
      return
    }

    setImporting(true)
    setProgress(0)
    setMessage('')

    try {
      for (let i = 0; i < carsCatalog.length; i++) {
        const car = carsCatalog[i] as Car
        const sanitizedCar = sanitizeForFirestore(car) as Record<string, unknown>

        await setDoc(doc(db, 'cars', car.id), sanitizedCar)
        setProgress(i + 1)
        setMessage(`Importing ${i + 1} of ${carsCatalog.length}...`)
      }

      setMessage(`✓ ${carsCatalog.length} cars imported successfully!`)
      setTimeout(() => {
        setMessage('')
        setProgress(0)
      }, 3000)
    } catch (error) {
      console.error('Import error:', error)
      setMessage('Error importing cars. Check console.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignItems: 'flex-end',
      }}
    >
      {message && (
        <div
          style={{
            backgroundColor: message.includes('successfully') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: message.includes('successfully')
              ? '1px solid rgba(34,197,94,0.3)'
              : '1px solid rgba(239,68,68,0.3)',
            color: message.includes('successfully') ? '#86efac' : '#ef5350',
            padding: '0.75rem 1rem',
            borderRadius: '0.625rem',
            fontFamily: 'Outfit',
            fontSize: '0.875rem',
            maxWidth: '250px',
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          backgroundColor: importing ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '0.625rem',
          color: '#f59e0b',
          fontFamily: 'Outfit',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: importing ? 'not-allowed' : 'pointer',
          opacity: importing ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!importing) {
            e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.3)'
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)'
          }
        }}
        onMouseLeave={(e) => {
          if (!importing) {
            e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)'
            e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'
          }
        }}
      >
        <Upload size={16} />
        {importing ? `${progress}/${carsCatalog.length}` : `Import ${carsCatalog.length} Cars`}
      </button>
    </div>
  )
}
