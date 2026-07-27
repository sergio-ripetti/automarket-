import { useEffect, useState } from 'react'
import { checkFileAvailable } from '../lib/fileAvailability'

// Tracks whether a set of stored document URLs are actually retrievable, so PDF cards can show
// a clear "unavailable" fallback instead of a link that silently 404s/401s when clicked.
export function useFileAvailability(urls: string[]): Record<string, boolean | undefined> {
  const [availability, setAvailability] = useState<Record<string, boolean | undefined>>({})

  useEffect(() => {
    let cancelled = false
    urls.forEach((url) => {
      if (availability[url] !== undefined) return
      checkFileAvailable(url).then((ok) => {
        if (!cancelled) setAvailability((prev) => ({ ...prev, [url]: ok }))
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join('|')])

  return availability
}
