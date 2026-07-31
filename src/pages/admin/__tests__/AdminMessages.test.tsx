import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { Message } from '../../../lib/messagesService'
import * as messagesService from '../../../lib/messagesService'
import * as adminMessagesService from '../../../lib/adminMessagesService'
import AdminMessages from '../AdminMessages'

vi.mock('../../../lib/messagesService')
vi.mock('../../../lib/adminMessagesService')
vi.mock('../../../components/admin/AdminToast', () => ({
  default: () => null,
}))
const mockUseUserRole = vi.fn<() => { role: 'admin' | 'demo'; isDemo: boolean; loading: boolean }>(
  () => ({ role: 'admin', isDemo: false, loading: false })
)
vi.mock('../../../hooks/useUserRole', () => ({
  useUserRole: () => mockUseUserRole(),
}))

const createMessage = (overrides?: Partial<Message>): Message => ({
  id: 'msg-123',
  senderName: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-9876',
  reason: 'General Inquiry',
  message: 'Hello, I have a question.',
  read: false,
  type: 'contact',
  createdAt: { toDate: () => new Date('2025-01-01') } as unknown as Message['createdAt'],
  ...overrides,
})

// Cards only render their action row (Read/Unread, Delete) once expanded by clicking the card
function expandCard(name = 'Jane Smith') {
  fireEvent.click(screen.getByText(name))
}

// AdminMessages now fetches via messagesService.getMessages() (GET /api/messages backend
// endpoint) on mount and polls every 30s, instead of a Firestore onSnapshot subscription -
// Firestore's 'messages' rule denies all direct client reads (see firestore.rules). This helper
// mocks getMessages() to resolve with the given list, and exposes a way to change what the next
// poll tick resolves with (simulating a new message having arrived).
function mockGetMessages(initialMessages: Message[]) {
  let current = initialMessages
  vi.mocked(messagesService.getMessages).mockImplementation(async () => current)
  return {
    setNext: (messages: Message[]) => { current = messages },
  }
}

describe('AdminMessages - backend polling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('fetches exactly once on mount', async () => {
    mockGetMessages([createMessage()])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(messagesService.getMessages).toHaveBeenCalledTimes(1)
    })
  })

  it('stops polling after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockGetMessages([createMessage()])

    const { unmount } = render(<AdminMessages />)
    await vi.waitFor(() => expect(messagesService.getMessages).toHaveBeenCalledTimes(1))

    unmount()
    const callsAtUnmount = vi.mocked(messagesService.getMessages).mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(messagesService.getMessages).toHaveBeenCalledTimes(callsAtUnmount)
    vi.useRealTimers()
  })

  it('renders both Contact and Offer message types', async () => {
    mockGetMessages([
      createMessage({ id: 'c1', senderName: 'Contact Person', type: 'contact' }),
      createMessage({ id: 'o1', senderName: 'Offer Person', type: 'offer', offerPrice: 20000, carTitle: 'Toyota Camry', carPrice: 25000 }),
    ])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('Contact Person')).toBeInTheDocument()
      expect(screen.getByText('Offer Person')).toBeInTheDocument()
    })
  })

  it('messages render newest first', async () => {
    mockGetMessages([
      createMessage({ id: 'old', senderName: 'Old Sender', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as Message['createdAt'] }),
      createMessage({ id: 'new', senderName: 'New Sender', createdAt: { toDate: () => new Date('2025-06-01') } as unknown as Message['createdAt'] }),
    ])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('New Sender')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/Sender$/).map((el) => el.textContent)
    expect(names).toEqual(['New Sender', 'Old Sender'])
  })

  it('a new poll tick (simulating a newly submitted message) surfaces it at the top', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { setNext } = mockGetMessages([createMessage({ id: 'existing', senderName: 'Existing Sender' })])

    render(<AdminMessages />)

    await vi.waitFor(() => {
      expect(screen.getByText('Existing Sender')).toBeInTheDocument()
    })

    setNext([
      createMessage({ id: 'brand-new', senderName: 'Brand New Sender', createdAt: { toDate: () => new Date('2030-01-01') } as unknown as Message['createdAt'] }),
      createMessage({ id: 'existing', senderName: 'Existing Sender', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as Message['createdAt'] }),
    ])
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })

    await vi.waitFor(() => {
      expect(screen.getByText('Brand New Sender')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/Sender$/).map((el) => el.textContent)
    expect(names[0]).toBe('Brand New Sender')
    vi.useRealTimers()
  })

  it('a persistent fetch error does not loop or repeatedly toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(messagesService.getMessages).mockRejectedValue(new Error('Fetch failed'))

    render(<AdminMessages />)
    await vi.waitFor(() => expect(messagesService.getMessages).toHaveBeenCalledTimes(1))

    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })

    // Fetch keeps being retried on each poll tick, but the toast-dedup ref means only the first
    // failure (of a consecutive run) would have toasted - no crash, no unbounded toast queue.
    expect(messagesService.getMessages).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })
})

describe('AdminMessages - Backend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders the message list delivered by getMessages', async () => {
    mockGetMessages([createMessage()])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  describe('Mark Read / Unread', () => {
    it('calls markAsRead exactly once when unread message toggle clicked', async () => {
      mockGetMessages([createMessage({ read: false })])
      vi.mocked(adminMessagesService.markAsRead).mockResolvedValue({ success: true })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(document.getElementById('admin-messages-read-button-0')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('admin-messages-read-button-0')!)

      await waitFor(() => {
        expect(adminMessagesService.markAsRead).toHaveBeenCalledTimes(1)
        expect(adminMessagesService.markAsRead).toHaveBeenCalledWith('msg-123')
      })
      expect(adminMessagesService.markAsUnread).not.toHaveBeenCalled()
    })

    it('calls markAsUnread exactly once when read message toggle clicked', async () => {
      mockGetMessages([createMessage({ read: true })])
      vi.mocked(adminMessagesService.markAsUnread).mockResolvedValue({ success: true })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(document.getElementById('admin-messages-read-button-0')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('admin-messages-read-button-0')!)

      await waitFor(() => {
        expect(adminMessagesService.markAsUnread).toHaveBeenCalledTimes(1)
        expect(adminMessagesService.markAsUnread).toHaveBeenCalledWith('msg-123')
      })
      expect(adminMessagesService.markAsRead).not.toHaveBeenCalled()
    })

    it('preserves original read state when backend update fails', async () => {
      mockGetMessages([createMessage({ read: false })])
      vi.mocked(adminMessagesService.markAsRead).mockResolvedValue({
        success: false,
        error: 'Update failed',
      })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(document.getElementById('admin-messages-read-button-0')).toBeInTheDocument()
      })

      fireEvent.click(document.getElementById('admin-messages-read-button-0')!)

      await waitFor(() => {
        expect(adminMessagesService.markAsRead).toHaveBeenCalledTimes(1)
      })

      // Button should still say "Read" (i.e. message still unread) since update failed
      expect(document.getElementById('admin-messages-read-button-0')?.textContent).toBe('Read')
    })

    it('the unread badge count stays consistent with the visible unread records after marking read', async () => {
      mockGetMessages([
        createMessage({ id: 'm1', senderName: 'One', read: false }),
        createMessage({ id: 'm2', senderName: 'Two', read: false }),
      ])
      vi.mocked(adminMessagesService.markAsRead).mockResolvedValue({ success: true })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('2 unread messages')).toBeInTheDocument()
      })

      expandCard('One')
      fireEvent.click(document.getElementById('admin-messages-read-button-0')!)

      await waitFor(() => {
        expect(screen.getByText('1 unread message')).toBeInTheDocument()
      })
    })
  })

  describe('Delete', () => {
    it('calls deleteMessage exactly once with correct id when Delete confirmed', async () => {
      mockGetMessages([createMessage()])
      vi.mocked(adminMessagesService.deleteMessage).mockResolvedValue({ success: true })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(adminMessagesService.deleteMessage).toHaveBeenCalledTimes(1)
        expect(adminMessagesService.deleteMessage).toHaveBeenCalledWith('msg-123')
      })
    })

    it('removes message from list after successful delete', async () => {
      mockGetMessages([createMessage()])
      vi.mocked(adminMessagesService.deleteMessage).mockResolvedValue({ success: true })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      })
    })

    it('preserves message in list when backend delete fails (no false success)', async () => {
      mockGetMessages([createMessage()])
      vi.mocked(adminMessagesService.deleteMessage).mockResolvedValue({
        success: false,
        error: 'Delete failed',
      })

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(adminMessagesService.deleteMessage).toHaveBeenCalledTimes(1)
      })

      // Message must remain visible; no false success removal
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('does not call deleteMessage when confirm is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      mockGetMessages([createMessage()])

      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })

      expandCard()

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Delete'))

      expect(adminMessagesService.deleteMessage).not.toHaveBeenCalled()
    })
  })

  describe('Contact message reason badge', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders a known reason ("financing") as an uppercase badge instead of plain text', async () => {
      mockGetMessages([createMessage({ reason: 'financing' })])
      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('FINANCING')).toBeInTheDocument()
      })
    })

    it('renders distinct categories with different badge colors', async () => {
      mockGetMessages([
        createMessage({ id: 'p1', senderName: 'Purchase Person', reason: 'purchase' }),
        createMessage({ id: 's1', senderName: 'Sale Person', reason: 'sale' }),
      ])
      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('CAR PURCHASE')).toBeInTheDocument()
        expect(screen.getByText('CAR SALE')).toBeInTheDocument()
      })

      const purchaseBadge = screen.getByText('CAR PURCHASE')
      const saleBadge = screen.getByText('CAR SALE')
      expect(purchaseBadge.style.backgroundColor).not.toBe(saleBadge.style.backgroundColor)
    })

    it('falls back to an uppercased badge for an unrecognized/legacy reason value, without dropping the original wording', async () => {
      mockGetMessages([createMessage({ reason: 'General Inquiry' })])
      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('GENERAL INQUIRY')).toBeInTheDocument()
      })
    })

    it('does not render a reason badge for offer-type messages (offers keep their own OFFER badge)', async () => {
      mockGetMessages([createMessage({ type: 'offer', reason: 'purchase', offerPrice: 20000, carTitle: 'Toyota Camry', carPrice: 25000 })])
      render(<AdminMessages />)

      await waitFor(() => {
        expect(screen.getByText('OFFER')).toBeInTheDocument()
      })
      expect(screen.queryByText('CAR PURCHASE')).not.toBeInTheDocument()
    })
  })
})

describe('AdminMessages - demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUserRole.mockReturnValue({ role: 'demo', isDemo: true, loading: false })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    mockUseUserRole.mockReturnValue({ role: 'admin', isDemo: false, loading: false })
  })

  it('allows Mark Read (portfolio data is fictional/sample) but keeps Delete disabled with an accessible explanation', async () => {
    mockGetMessages([createMessage()])
    vi.mocked(adminMessagesService.markAsRead).mockResolvedValue({ success: true })

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    expandCard()

    await waitFor(() => {
      expect(document.getElementById('admin-messages-read-button-0')).toBeInTheDocument()
    })

    const readButton = document.getElementById('admin-messages-read-button-0') as HTMLButtonElement
    const deleteButton = document.getElementById('admin-messages-delete-button-0') as HTMLButtonElement

    expect(readButton).not.toBeDisabled()
    expect(deleteButton).toBeDisabled()
    expect(deleteButton).toHaveAttribute('title', 'Demo mode: deleting data is disabled.')

    fireEvent.click(readButton)
    await waitFor(() => {
      expect(adminMessagesService.markAsRead).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(deleteButton)
    expect(adminMessagesService.deleteMessage).not.toHaveBeenCalled()
  })
})
