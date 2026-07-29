import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'

const STORAGE_KEY = 'automarket_favourites'

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

function setFavorites(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  act(() => {
    window.dispatchEvent(new CustomEvent('favourites-changed'))
  })
}

describe('Navbar - Favorites navigation state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the empty state (no count badge) when zero vehicles are saved', () => {
    renderNavbar()
    const links = screen.getAllByRole('link', { name: 'Favorites' })
    expect(links.length).toBeGreaterThan(0)
    // No numeric badge text should be present anywhere in a Favorites link
    links.forEach((link) => {
      expect(link.textContent).not.toMatch(/\d/)
    })
  })

  it('shows an active state with count 1 when one vehicle is saved', async () => {
    setFavorites(['car-1'])
    renderNavbar()
    const links = await screen.findAllByRole('link', { name: /Favorites, 1 saved vehicle/ })
    expect(links.length).toBeGreaterThan(0)
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it('shows the correct count for multiple saved vehicles', async () => {
    setFavorites(['car-1', 'car-2', 'car-3'])
    renderNavbar()
    const links = await screen.findAllByRole('link', { name: /Favorites, 3 saved vehicles/ })
    expect(links.length).toBeGreaterThan(0)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('updates the count immediately when a favourites-changed event adds a vehicle', async () => {
    renderNavbar()
    expect(screen.getAllByRole('link', { name: 'Favorites' }).length).toBeGreaterThan(0)

    setFavorites(['car-1'])

    const links = await screen.findAllByRole('link', { name: /Favorites, 1 saved vehicle/ })
    expect(links.length).toBeGreaterThan(0)
  })

  it('updates the count immediately when a favourites-changed event removes a vehicle', async () => {
    setFavorites(['car-1', 'car-2'])
    renderNavbar()
    await screen.findAllByRole('link', { name: /Favorites, 2 saved vehicles/ })

    setFavorites(['car-1'])

    const links = await screen.findAllByRole('link', { name: /Favorites, 1 saved vehicle/ })
    expect(links.length).toBeGreaterThan(0)
  })

  it('returns to the empty state after removing the last favorite', async () => {
    setFavorites(['car-1'])
    renderNavbar()
    await screen.findAllByRole('link', { name: /Favorites, 1 saved vehicle/ })

    setFavorites([])

    const links = await screen.findAllByRole('link', { name: 'Favorites' })
    expect(links.length).toBeGreaterThan(0)
  })

  it('caps the displayed count at 99+ for very large favorite lists', async () => {
    setFavorites(Array.from({ length: 150 }, (_, i) => `car-${i}`))
    renderNavbar()
    expect(await screen.findAllByText('99+')).not.toHaveLength(0)
  })

  it('reads from the same localStorage key/event used by the rest of the app (single source of truth)', async () => {
    renderNavbar()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['car-1']))
    act(() => {
      window.dispatchEvent(new CustomEvent('favourites-changed'))
    })
    await screen.findAllByRole('link', { name: /Favorites, 1 saved vehicle/ })
  })

  it('persists the saved state across a remount (simulating a page refresh)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['car-1', 'car-2']))
    const { unmount } = renderNavbar()
    await screen.findAllByRole('link', { name: /Favorites, 2 saved vehicles/ })
    unmount()

    renderNavbar()
    await screen.findAllByRole('link', { name: /Favorites, 2 saved vehicles/ })
  })
})
