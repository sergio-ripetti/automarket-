import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import AdminLayout from '../AdminLayout'
import ProtectedRoute from '../ProtectedRoute'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}))

vi.mock('../../../lib/firebase', () => ({ db: {} }))

vi.mock('../../../lib/authService', () => ({
  logoutAdmin: vi.fn(async () => {}),
  authenticatedFetch: vi.fn(async () => new Response(JSON.stringify({ success: true, applications: [] }))),
}))

const mockUseAuth = vi.fn((): { user: { uid: string } | null; loading: boolean } => ({ user: { uid: 'admin-1' }, loading: false }))
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Wraps a dummy page so tests can observe how many times a nested route's own content mounts,
// independent of whether the parent AdminLayout mounts/unmounts.
function makePage(label: string, onMount: () => void) {
  return function Page() {
    useEffect(() => { onMount() }, [])
    return <div>{label} page content</div>
  }
}

// Renders the exact same nested-route shape App.tsx now uses for /admin/* routes: a single
// ProtectedRoute+AdminLayout parent with dummy child routes, so the persistence guarantee can be
// verified using the real AdminLayout component without pulling in the full App/Firestore stack.
function renderAdminRoutingTree(dashboardMount: () => void, carsMount: () => void, initialPath = '/admin') {
  const DashboardPage = makePage('Dashboard', dashboardMount)
  const CarsPage = makePage('Inventory', carsMount)

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/login" element={<div>Login page</div>} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="cars" element={<CarsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Admin routing - persistent AdminLayout across nested route navigation', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: 'admin-1' }, loading: false })
  })

  it('mounts AdminLayout once and keeps it mounted while nested route content changes', () => {
    const dashboardMount = vi.fn()
    const carsMount = vi.fn()

    // Instruments AdminLayout's persistence indirectly via a stable DOM node reference check:
    // the sidebar nav element itself, since AdminLayout has no exported mount hook.
    renderAdminRoutingTree(dashboardMount, carsMount)
    const sidebarNavFirst = document.getElementById('admin-sidebar-nav')
    expect(sidebarNavFirst).toBeInTheDocument()
    expect(dashboardMount).toHaveBeenCalledTimes(1)

    // Simulate navigating to Inventory by clicking the real sidebar NavLink (client-side nav)
    act(() => {
      screen.getByText('Inventory').click()
    })

    expect(screen.getByText('Inventory page content')).toBeInTheDocument()
    expect(carsMount).toHaveBeenCalledTimes(1)
    // The sidebar nav DOM node must be the SAME node (AdminLayout did not unmount/remount)
    const sidebarNavAfter = document.getElementById('admin-sidebar-nav')
    expect(sidebarNavAfter).toBe(sidebarNavFirst)
  })

  it('renders nested admin links as real <a> elements with SPA-relative hrefs (client-side navigation, not a raw page reload)', () => {
    renderAdminRoutingTree(vi.fn(), vi.fn())
    const inventoryLink = screen.getByText('Inventory').closest('a')
    expect(inventoryLink).toHaveAttribute('href', '/admin/cars')
  })

  it('renders the correct page directly on a nested route without visiting the parent first (refresh-equivalent)', () => {
    renderAdminRoutingTree(vi.fn(), vi.fn(), '/admin/cars')
    expect(screen.getByText('Inventory page content')).toBeInTheDocument()
  })

  it('protected routing still redirects when there is no authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderAdminRoutingTree(vi.fn(), vi.fn())
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('shows the loading state instead of a false failure while auth is still initializing', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    renderAdminRoutingTree(vi.fn(), vi.fn())
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
