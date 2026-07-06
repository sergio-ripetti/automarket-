import { useState } from 'react'
import { reseedCars } from '../lib/carsService'

// Floating admin utility button that triggers reseeding of car data/images; auto-hides itself shortly after a successful run
export default function SeedButton() {
  const [seeding, setSeeding] = useState(false)
  const [done, setDone] = useState(false)
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  // Calls reseedCars() to refresh car records/images in Firestore, then hides the button after a short delay on success
  const handleSeed = async () => {
    setSeeding(true)
    try {
      await reseedCars()
      setDone(true)
      setTimeout(() => setVisible(false), 2500)
    } catch (err) {
      console.error('Reseed failed:', err)
      alert('Seeding failed — check console for details.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <button
      onClick={handleSeed}
      disabled={seeding || done}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        background: done
          ? 'linear-gradient(135deg, #16a34a, #15803d)'
          : 'linear-gradient(135deg, #2C6E9E, #1F5680)',
        color: '#000',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.05em',
        padding: '0.625rem 1.25rem',
        borderRadius: '2rem',
        border: 'none',
        cursor: seeding || done ? 'default' : 'pointer',
        opacity: seeding ? 0.7 : 1,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {done ? '✓ Done!' : seeding ? 'Updating…' : '⚡ Update Car Images'}
    </button>
  )
}
