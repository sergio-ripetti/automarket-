import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from '../AdminLayout'
import { AI_MESSAGES_STORAGE_KEY, saveAIConversation } from '../../../lib/aiConversationStorage'

const logoutAdmin = vi.fn(async () => {})

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()), // returns an unsubscribe function
}))

vi.mock('../../../lib/firebase', () => ({ db: {} }))

vi.mock('../../../lib/authService', () => ({
  logoutAdmin: () => logoutAdmin(),
  authenticatedFetch: vi.fn(async () => new Response(JSON.stringify({ success: true, applications: [] }))),
}))

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminLayout - sign-out clears only the AI conversation key', () => {
  beforeEach(() => {
    logoutAdmin.mockClear()
    sessionStorage.clear()
  })

  it('removes the AI session key on logout while preserving unrelated sessionStorage, and still signs out', async () => {
    saveAIConversation([{ role: 'user', content: 'business question', id: 'u1' }])
    sessionStorage.setItem('unrelated-key', 'keep-me')
    expect(sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)).not.toBeNull()

    renderLayout()
    fireEvent.click(screen.getByText('Sign Out'))

    await waitFor(() => {
      expect(logoutAdmin).toHaveBeenCalledTimes(1)
    })

    expect(sessionStorage.getItem(AI_MESSAGES_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem('unrelated-key')).toBe('keep-me')
  })
})
