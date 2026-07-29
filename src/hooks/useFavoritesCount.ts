import { useEffect, useState } from 'react'

const STORAGE_KEY = 'automarket_favourites'

// Reads the saved-vehicle id list from the same localStorage key/event that CarCard, CarDetail,
// and Favourites.tsx already read and write ('automarket_favourites' + the 'favourites-changed'
// custom event) - this hook does not introduce a second favorites store, it only exposes the
// count of that existing list for read-only display (e.g. the Header nav badge).
function readCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw.length : 0
  } catch {
    return 0
  }
}

export function useFavoritesCount(): number {
  const [count, setCount] = useState(readCount)

  useEffect(() => {
    const handleChange = () => setCount(readCount())
    window.addEventListener('favourites-changed', handleChange as EventListener)
    // 'storage' fires when another tab/window changes localStorage, keeping the badge in sync there too
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener('favourites-changed', handleChange as EventListener)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  return count
}
