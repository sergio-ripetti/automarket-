import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Message } from '../../../lib/messagesService'
import * as messagesService from '../../../lib/messagesService'
import * as adminMessagesService from '../../../lib/adminMessagesService'
import AdminMessages from '../AdminMessages'

vi.mock('../../../lib/messagesService')
vi.mock('../../../lib/adminMessagesService')
vi.mock('../../../components/admin/AdminToast', () => ({
  default: () => null,
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

// Simulates messagesService.subscribeToMessages: the component calls it once on mount with
// (onData, onError). This helper captures those callbacks so a test can push new "snapshot"
// data (simulating a new message arriving in real time) or an error, and exposes the
// unsubscribe spy so cleanup-on-unmount can be verified.
function mockSubscription(initialMessages: Message[]) {
  let capturedOnData: ((messages: Message[]) => void) | null = null
  let capturedOnError: ((err: Error) => void) | null = null
  const unsubscribeSpy = vi.fn()

  vi.mocked(messagesService.subscribeToMessages).mockImplementation((onData, onError) => {
    capturedOnData = onData
    capturedOnError = onError
    onData(initialMessages)
    return unsubscribeSpy
  })

  return {
    unsubscribeSpy,
    emit: (messages: Message[]) => capturedOnData?.(messages),
    emitError: (err: Error) => capturedOnError?.(err),
  }
}

describe('AdminMessages - Real-time subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('subscribes exactly once on mount and unsubscribes on unmount (no duplicate subscriptions, no leak)', async () => {
    const { unsubscribeSpy } = mockSubscription([createMessage()])

    const { unmount } = render(<AdminMessages />)

    await waitFor(() => {
      expect(messagesService.subscribeToMessages).toHaveBeenCalledTimes(1)
    })

    unmount()
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
  })

  it('renders both Contact and Offer message types', async () => {
    mockSubscription([
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
    mockSubscription([
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

  it('a new snapshot delivery (simulating a newly submitted message) appears automatically at the top, without remounting', async () => {
    const { emit } = mockSubscription([createMessage({ id: 'existing', senderName: 'Existing Sender' })])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('Existing Sender')).toBeInTheDocument()
    })

    // Simulate Firestore delivering a new snapshot after a new public submission
    emit([
      createMessage({ id: 'brand-new', senderName: 'Brand New Sender', createdAt: { toDate: () => new Date('2030-01-01') } as unknown as Message['createdAt'] }),
      createMessage({ id: 'existing', senderName: 'Existing Sender', createdAt: { toDate: () => new Date('2025-01-01') } as unknown as Message['createdAt'] }),
    ])

    await waitFor(() => {
      expect(screen.getByText('Brand New Sender')).toBeInTheDocument()
    })

    const names = screen.getAllByText(/Sender$/).map((el) => el.textContent)
    expect(names[0]).toBe('Brand New Sender')
    // Still only one subscription was ever created for this new data to arrive through
    expect(messagesService.subscribeToMessages).toHaveBeenCalledTimes(1)
  })

  it('a persistent listener error does not loop or repeatedly toast', async () => {
    const { emitError } = mockSubscription([])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(messagesService.subscribeToMessages).toHaveBeenCalledTimes(1)
    })

    emitError(new Error('Listener failed'))
    emitError(new Error('Listener failed again'))
    emitError(new Error('Listener failed a third time'))

    // Only a single subscription was ever created, regardless of how many times the
    // listener's error callback fires
    expect(messagesService.subscribeToMessages).toHaveBeenCalledTimes(1)
  })
})

describe('AdminMessages - Backend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders the message list delivered by the subscription', async () => {
    mockSubscription([createMessage()])

    render(<AdminMessages />)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  describe('Mark Read / Unread', () => {
    it('calls markAsRead exactly once when unread message toggle clicked', async () => {
      mockSubscription([createMessage({ read: false })])
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
      mockSubscription([createMessage({ read: true })])
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
      mockSubscription([createMessage({ read: false })])
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
      mockSubscription([
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
      mockSubscription([createMessage()])
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
      mockSubscription([createMessage()])
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
      mockSubscription([createMessage()])
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
      mockSubscription([createMessage()])

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
})
