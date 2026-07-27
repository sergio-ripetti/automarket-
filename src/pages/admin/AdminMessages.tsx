import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, Mail, Eye, X } from 'lucide-react'
import { subscribeToMessages } from '../../lib/messagesService'
import { markAsRead, markAsUnread, deleteMessage } from '../../lib/adminMessagesService'
import { sortByCreatedAtDesc } from '../../lib/timestampUtils'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { Message } from '../../lib/messagesService'

type TypeFilter = 'all' | 'contact' | 'offer' | 'unread'

// Converts a Firestore Timestamp into a readable NZ date string
function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Formats a number as NZD currency for display
function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

const tabs: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'contact', label: 'Contact' },
  { id: 'offer', label: 'Offers' },
  { id: 'unread', label: 'Unread' },
]

// Admin inbox page listing contact and offer messages - lets staff filter, read/unread toggle,
// reply via email, and delete messages; data is loaded from and written back to Firestore
export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const { toast, showToast, dismissToast } = useToast()
  // Ensures a persistent listener error only toasts once, not on every re-delivery
  const hasNotifiedErrorRef = useRef(false)

  // Subscribes to real-time updates on the messages collection on mount. This keeps the visible
  // list in sync with the sidebar's own onSnapshot-based unread badge (AdminLayout.tsx) without a
  // separate polling lifecycle - both listen to the same collection/field and always agree.
  useEffect(() => {
    const unsubscribe = subscribeToMessages(
      (data) => {
        setMessages(sortByCreatedAtDesc(data))
        setLoading(false)
        hasNotifiedErrorRef.current = false
      },
      (err) => {
        console.error(err)
        setLoading(false)
        if (!hasNotifiedErrorRef.current) {
          showToast('Failed to load messages.', 'error')
          hasNotifiedErrorRef.current = true
        }
      },
    )
    return () => unsubscribe()
  }, [showToast])

  const filtered = messages
    .filter((m) => m.type !== 'financing')
    .filter((m) => {
      if (activeTab === 'all') return true
      if (activeTab === 'contact') return m.type === 'contact'
      if (activeTab === 'offer') return m.type === 'offer'
      if (activeTab === 'unread') return !m.read
      return true
    })

  const unreadCount = messages.filter((m) => !m.read).length

  // Toggles a message's read/unread status via backend and syncs local state
  const handleToggleRead = async (msg: Message) => {
    try {
      let result
      if (msg.read) {
        result = await markAsUnread(msg.id)
      } else {
        result = await markAsRead(msg.id)
      }

      if (result.success) {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: !msg.read } : m))
      } else {
        showToast(result.error || 'Failed to update message status.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to update message status.', 'error')
    }
  }

  // Deletes a message via backend after user confirmation, then removes it from local state
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return
    try {
      const result = await deleteMessage(id)
      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
        showToast('Message deleted.', 'success')
      } else {
        showToast(result.error || 'Failed to delete message.', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to delete message.', 'error')
    }
  }

  return (
    <div id="admin-messages-main-container" className="admin-messages-main-container">
      <div id="admin-messages-header" className="admin-messages-header mb-8">
        <h1 className="font-bebas text-[#0D1B2A] mb-1">Inbox</h1>
        <p className="text-sm text-[#0D1B2A]/40 font-inter">
          {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter Navigation Tabs */}
      <div id="admin-messages-tabs" className="admin-messages-tabs mb-8">
        <style>{`
          .messages-filter-tabs-container {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0 0 8px 0;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .messages-filter-tabs-container::-webkit-scrollbar {
            display: none;
          }
          .messages-filter-tab {
            display: inline-flex;
            align-items: center;
            padding: 12px 18px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            border-radius: 8px 8px 0 0;
            font-family: 'Poppins', sans-serif;
            font-size: 15px;
            font-weight: 500;
            color: #6B7280;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .messages-filter-tab:hover {
            background-color: #F3F4F6;
            color: #111827;
          }
          .messages-filter-tab.active {
            background-color: #EEF2FF;
            color: #2563EB;
            border-bottom-color: #2563EB;
            font-weight: 600;
          }
          .messages-filter-tab.active:hover {
            background-color: #E0E7FF;
          }
          @media (max-width: 768px) {
            .messages-filter-tabs-container {
              gap: 16px;
            }
            .messages-filter-tab {
              padding: 10px 16px;
              font-size: 14px;
            }
          }
        `}</style>
        <div className="messages-filter-tabs-container">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              id={`admin-messages-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`messages-filter-tab ${activeTab === id ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div id="admin-messages-list-wrapper" className="admin-messages-list-wrapper">
        <style>{`
          .messages-card {
            background: #FFFFFF;
            border: 1px solid #E0E0DC;
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 1.25rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .messages-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
          .messages-card.unread {
            border-left: 3px solid #2563EB;
          }
          .messages-card.offer {
            border-left: 3px solid #F59E0B;
          }
        `}</style>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse messages-card" style={{ backgroundColor: '#F3F4F6' }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9CA3AF', fontFamily: 'Outfit' }}>
            <Mail size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No messages yet.</p>
          </div>
        ) : filtered.map((msg, idx) => {
          const isOffer = msg.type === 'offer'
          return (
            <div
              key={msg.id}
              id={`admin-messages-list-item-${idx}`}
              className={`admin-messages-list-item admin-messages-list-item-${idx} messages-card ${!msg.read ? 'unread' : ''} ${isOffer ? 'offer' : ''}`}
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: expandedId === msg.id ? '1rem' : 0 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: msg.read ? '#D1D5DB' : '#2563EB',
                  flexShrink: 0, marginTop: '0.6rem',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                    <p className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.03em', lineHeight: 1, fontSize: '1rem', fontWeight: 600 }}>
                      {msg.senderName}
                    </p>
                    <p style={{color: "#6B7280", whiteSpace: 'nowrap', fontSize: '0.8rem'}}>
                      {fmtDate(msg.createdAt as { toDate: () => Date })}
                    </p>
                  </div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                    {msg.email} {msg.phone && `• ${msg.phone}`}
                  </p>

                  {isOffer ? (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            fontFamily: 'Poppins',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'currentColor',
                              opacity: 0.6,
                            }}
                          />
                          OFFER
                        </span>
                      </div>
                      <p className="font-bebas" style={{ fontSize: '1rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>
                        {msg.carTitle || 'Vehicle'}
                      </p>
                      <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>
                        {fmt(msg.offerPrice || 0)}
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#767676' }}>
                        vs asking {fmt(msg.carPrice || 0)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#1A1A1A', marginBottom: '0.25rem' }}>
                        {msg.reason}
                      </p>
                      <p style={{
                        fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expandedId === msg.id ? 'normal' : 'nowrap',
                        lineHeight: 1.5,
                      }}>
                        {msg.message}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {expandedId === msg.id && (
                <>
                  <style>{`
                    .message-actions {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 0.75rem;
                      padding-top: 1rem;
                      border-top: 1px solid #E0E0DC;
                      align-items: center;
                    }
                    .message-actions button {
                      flex: 1 1 calc(50% - 0.375rem);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      gap: 0.5rem;
                      padding: 0.75rem 1rem;
                      border-radius: 0.75rem;
                      font-family: 'Poppins', sans-serif;
                      font-size: 0.8rem;
                      font-weight: 500;
                      cursor: pointer;
                      white-space: nowrap;
                      min-height: 44px;
                      transition: all 0.2s ease;
                      border: 1px solid;
                    }
                    @media (min-width: 640px) {
                      .message-actions button {
                        flex: 0 0 auto;
                      }
                    }
                    .message-actions .delete-btn {
                      margin-left: auto;
                      flex: 0 0 auto;
                    }
                  `}</style>
                  <div id={`admin-messages-actions-${idx}`} className="admin-messages-actions message-actions">
                  <button
                    id={`admin-messages-details-button-${idx}`}
                    className="admin-messages-details-button"
                    onClick={(e) => { e.stopPropagation(); setSelectedMessage(msg) }}
                    style={{
                      border: '1px solid #E0E0DC', color: '#6B7280', backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB'
                      e.currentTarget.style.backgroundColor = '#F0F9FF'
                      e.currentTarget.style.color = '#2563EB'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0DC'
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                      e.currentTarget.style.color = '#6B7280'
                    }}
                  >
                    <Eye size={14} /> <span className="hidden sm:inline">Details</span>
                  </button>
                  <button
                    id={`admin-messages-reply-button-${idx}`}
                    className="admin-messages-reply-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      const subject = isOffer ? `Re: Offer for ${msg.carTitle}` : msg.reason
                      const body = encodeURIComponent('Thank you for contacting AutoMarket. We appreciate your message and will respond shortly.')
                      window.location.href = `mailto:${msg.email}?subject=${encodeURIComponent(subject)}&body=${body}`
                    }}
                    style={{
                      border: '1px solid #D1D5DB', color: '#374151', backgroundColor: '#F9FAFB',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9CA3AF'
                      e.currentTarget.style.backgroundColor = '#F3F4F6'
                      e.currentTarget.style.color = '#1A1A1A'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB'
                      e.currentTarget.style.backgroundColor = '#F9FAFB'
                      e.currentTarget.style.color = '#374151'
                    }}
                  >
                    Reply
                  </button>
                  <button
                    id={`admin-messages-read-button-${idx}`}
                    className="admin-messages-read-button"
                    onClick={(e) => { e.stopPropagation(); handleToggleRead(msg) }}
                    style={{
                      border: '1px solid #E0E0DC', color: '#6B7280', backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB'
                      e.currentTarget.style.backgroundColor = '#F0F9FF'
                      e.currentTarget.style.color = '#2563EB'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0DC'
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                      e.currentTarget.style.color = '#6B7280'
                    }}
                  >
                    {msg.read ? 'Unread' : 'Read'}
                  </button>
                  <button
                    id={`admin-messages-delete-button-${idx}`}
                    className="admin-messages-delete-button delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id) }}
                    style={{
                      border: '1px solid #EF4444', color: '#EF4444', backgroundColor: '#FFFFFF',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2'
                      e.currentTarget.style.borderColor = '#DC2626'
                      e.currentTarget.style.color = '#DC2626'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                      e.currentTarget.style.borderColor = '#EF4444'
                      e.currentTarget.style.color = '#EF4444'
                    }}
                  >
                    <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
                  </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Details Modal */}
      <style>{`
        .message-modal {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          overflow-y: auto;
          background-color: rgba(0, 0, 0, 0.5);
        }
        .message-modal-content {
          background-color: #FFFFFF;
          border: 1px solid #E0E0DC;
          border-radius: 0.75rem;
          width: 100%;
          max-width: 85vw;
          max-height: 92vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        @media (min-width: 768px) {
          .message-modal-content {
            max-width: 650px;
            border-radius: 0.75rem;
          }
        }
        .message-modal-header {
          position: sticky;
          top: 0;
          background: #FFFFFF;
          padding: clamp(1rem, 2vw, 1.5rem);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 10;
          gap: clamp(0.75rem, 2vw, 1rem);
          flex-wrap: wrap;
          border-bottom: 1px solid #E0E0DC;
        }
        .message-modal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: clamp(1rem, 3vw, 1.25rem);
          width: 100%;
          box-sizing: border-box;
        }
        .message-modal-grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(1rem, 2.5vw, 1.5rem);
        }
        @media (min-width: 768px) {
          .message-modal-grid-2col {
            grid-template-columns: 1fr 1fr;
            gap: clamp(1.25rem, 3vw, 1.75rem);
          }
        }
        .message-modal-title {
          font-size: clamp(1.1rem, 4vw, 1.3rem);
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #1A1A1A;
        }
        .message-modal-section {
          margin-bottom: 1.5rem;
        }
        .message-modal-label {
          font-size: 0.7rem;
          color: #767676;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.4rem;
          display: block;
        }
        .message-modal-value {
          font-size: 0.9rem;
          color: #1A1A1A;
          font-weight: 500;
        }
        .message-modal-value-highlight {
          font-size: clamp(1rem, 3vw, 1.2rem);
          color: #1A1A1A;
          font-weight: 600;
        }
        .message-modal-footer {
          padding: clamp(1rem, 2vw, 1.75rem);
          border-top: 1px solid #E0E0DC;
          display: flex;
          gap: clamp(0.5rem, 1.5vw, 0.75rem);
          flex-direction: column;
        }
        .message-modal-footer button {
          min-height: 44px;
        }
        .modal-btn-primary {
          background-color: #2563EB;
          color: #FFFFFF;
        }
        .modal-btn-primary:hover {
          background-color: #1D4ED8;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .modal-btn-secondary {
          background-color: #F3F4F6;
          border-color: #E0E0DC;
          color: #1A1A1A;
        }
        .modal-btn-secondary:hover {
          background-color: #E5E7EB;
          border-color: #D1D5DB;
        }
        .modal-btn-close {
          background-color: #F3F4F6;
          border-color: #E0E0DC;
          color: #1A1A1A;
        }
        .modal-btn-close:hover {
          background-color: #E5E7EB;
          border-color: #D1D5DB;
        }
      `}</style>
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            id="admin-messages-modal-overlay"
            className="admin-messages-modal-overlay message-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              id="admin-messages-modal-detail"
              className="admin-messages-modal-detail message-modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div id="admin-modal-header" className="admin-modal-header message-modal-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      fontFamily: 'Poppins',
                      backgroundColor: selectedMessage.type === 'offer' ? '#FEF3C7' : selectedMessage.type === 'contact' ? '#DBEAFE' : '#DBEAFE',
                      color: selectedMessage.type === 'offer' ? '#92400E' : selectedMessage.type === 'contact' ? '#1E40AF' : '#1E40AF',
                      marginBottom: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                        opacity: 0.6,
                      }}
                    />
                    {selectedMessage.type === 'offer' ? 'OFFER' : selectedMessage.type === 'contact' ? 'CONTACT' : 'FINANCING'}
                  </span>
                  <p className="font-bebas message-modal-title" style={{
                    color: 'black', lineHeight: 1.2, marginBottom: 0
                  }}>
                    {selectedMessage.senderName}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.7)', marginBottom: '1rem' }}>
                    {fmtDate(selectedMessage.createdAt as unknown as { toDate: () => Date })}
                  </p>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="modal-btn-close"
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      border: '1px solid #E0E0DC',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div id="admin-modal-body" className="admin-modal-body message-modal-body">
                {selectedMessage.type === 'offer' ? (
                  <>
                    {/* Offer Details */}
                    <div className="message-modal-section" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #E0E0DC' }}>
                      <p className="font-bebas" style={{
                        fontSize: 'clamp(1.15rem, 4vw, 1.4rem)', color: '#1A1A1A', marginBottom: '0.75rem', fontWeight: 600
                      }}>
                        {selectedMessage.carTitle || 'Vehicle'}
                      </p>
                      <p className="font-bebas" style={{
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#1A1A1A', marginBottom: '0.75rem', fontWeight: 600
                      }}>
                        {fmt(selectedMessage.offerPrice || 0)}
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#767676', marginBottom: '0.75rem' }}>
                        Listed at {fmt(selectedMessage.carPrice || 0)}
                      </p>
                      {(selectedMessage.offerPrice ?? 0) < (selectedMessage.carPrice ?? 0) ? (
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(239,68,68,0.6)' }}>
                          {fmt((selectedMessage.carPrice ?? 0) - (selectedMessage.offerPrice ?? 0))} below asking price
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(34,197,94,0.6)' }}>
                          At or above asking price
                        </p>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #E0E0DC' }}>
                      <div className="message-modal-grid-2col">
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>First Name</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.firstName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Last Name</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.lastName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.email}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phone</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    {selectedMessage.message && (
                      <div>
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#1A1A1A', marginBottom: '0.75rem' }}>Note from buyer</p>
                        <p style={{
                          fontFamily: 'Outfit', fontSize: '0.875rem', color: '#767676', fontStyle: 'italic',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
                          overflowX: 'hidden', width: '100%', maxWidth: '100%',
                        }}>
                          {selectedMessage.message}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Contact Info */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #E0E0DC' }}>
                      <div className="message-modal-grid-2col">
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Name</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.senderName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.email}</p>
                        </div>
                        {selectedMessage.phone && (
                          <div>
                            <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phone</p>
                            <p style={{color: "#0D1B2A" }}>{selectedMessage.phone}</p>
                          </div>
                        )}
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reason</p>
                          <p style={{color: "#0D1B2A" }}>{selectedMessage.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: '#767676', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Message</p>
                      <p style={{
                        fontFamily: 'Outfit', fontSize: '0.875rem', color: '#767676',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
                        overflowX: 'hidden', width: '100%', maxWidth: '100%',
                      }}>
                        {selectedMessage.message}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div id="admin-modal-footer" className="admin-modal-footer message-modal-footer">
                <button
                  id="admin-messages-modal-reply-button"
                  className="admin-messages-modal-reply-button modal-btn-primary"
                  onClick={() => {
                    const subject = selectedMessage.type === 'offer'
                      ? `Re: Offer for ${selectedMessage.carTitle}`
                      : `Re: ${selectedMessage.reason}`
                    const body = encodeURIComponent('Thank you for contacting AutoMarket. We appreciate your message and will respond shortly.')
                    window.location.href = `mailto:${selectedMessage.email}?subject=${encodeURIComponent(subject)}&body=${body}`
                  }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    fontWeight: 600, fontFamily: 'Poppins', fontSize: '0.875rem',
                    border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                    minHeight: '44px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Reply via Email
                </button>
                <div className="message-modal-grid-2col">
                  <button
                    onClick={() => {
                      handleToggleRead(selectedMessage)
                      setSelectedMessage(null)
                    }}
                    className="modal-btn-secondary"
                    style={{
                      padding: '0.75rem 1rem',
                      fontFamily: 'Poppins', fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.5rem', cursor: 'pointer',
                      border: '1px solid #E0E0DC',
                      minHeight: '44px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {selectedMessage.read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="modal-btn-secondary"
                    style={{
                      padding: '0.75rem 1rem',
                      fontFamily: 'Poppins', fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.5rem', cursor: 'pointer',
                      border: '1px solid #E0E0DC',
                      minHeight: '44px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast && <AdminToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  )
}


