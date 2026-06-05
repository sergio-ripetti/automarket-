import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, Mail, Eye, X } from 'lucide-react'
import { getMessages, markAsRead, markAsUnread, deleteMessage } from '../../lib/messagesService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { Message } from '../../lib/messagesService'

type TypeFilter = 'all' | 'contact' | 'offer' | 'unread'

function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmt(price: number) {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

const tabs: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'contact', label: 'Contact' },
  { id: 'offer', label: 'Offers' },
  { id: 'unread', label: 'Unread' },
]

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TypeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMessages()
        setMessages(data)
      } catch (err) {
        console.error(err)
        showToast('Failed to load messages.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
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

  const handleToggleRead = async (msg: Message) => {
    try {
      if (msg.read) {
        await markAsUnread(msg.id)
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: false } : m))
      } else {
        await markAsRead(msg.id)
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: true } : m))
      }
    } catch {
      showToast('Failed to update message status.', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return
    try {
      await deleteMessage(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
      showToast('Message deleted.', 'success')
    } catch {
      showToast('Failed to delete message.', 'error')
    }
  }

  return (
    <div>
      <h1 className="font-bebas" style={{ fontSize: '2rem', color: 'white', lineHeight: 1, marginBottom: '0.25rem' }}>
        Inbox
      </h1>
      <p style={{ fontFamily: 'Outfit', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '2rem', fontFamily: 'Outfit', fontSize: '0.85rem',
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              ...(activeTab === id
                ? { backgroundColor: '#f59e0b', color: '#000', fontWeight: 700 }
                : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ backgroundColor: '#111111', height: 100, borderRadius: '0.75rem' }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>
            <Mail size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No messages yet.</p>
          </div>
        ) : filtered.map((msg) => {
          const isOffer = msg.type === 'offer'
          return (
            <div
              key={msg.id}
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
              style={{
                backgroundColor: '#111111',
                border: `1px solid ${msg.read ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.15)'}`,
                borderLeft: isOffer ? '3px solid #f59e0b' : undefined,
                borderRadius: '0.75rem', padding: '1.25rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: expandedId === msg.id ? '1rem' : 0 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: msg.read ? 'rgba(255,255,255,0.15)' : '#f59e0b',
                  flexShrink: 0, marginTop: '0.5rem',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                    <p className="font-bebas" style={{ fontSize: '1rem', color: 'white', letterSpacing: '0.03em', lineHeight: 1 }}>
                      {msg.senderName}
                    </p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {fmtDate(msg.createdAt as unknown as { toDate: () => Date })}
                    </p>
                  </div>
                  <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
                    {msg.email} {msg.phone && `· ${msg.phone}`}
                  </p>

                  {isOffer ? (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{
                          display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '0.375rem',
                          backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                          fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Outfit', marginBottom: '0.5rem',
                        }}>
                          OFFER
                        </div>
                      </div>
                      <p className="font-bebas" style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                        {(msg as any).carTitle || 'Vehicle'}
                      </p>
                      <p className="font-bebas" style={{ fontSize: '1.5rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                        {fmt((msg as any).offerPrice || 0)}
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        vs asking {fmt((msg as any).carPrice || 0)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
                        {msg.reason}
                      </p>
                      <p style={{
                        fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)',
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
                <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedMessage(msg) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontFamily: 'Outfit', fontSize: '0.8rem',
                      border: '1px solid rgba(100, 116, 139, 0.3)', color: 'rgba(255,255,255,0.6)', backgroundColor: 'transparent', cursor: 'pointer',
                    }}
                  >
                    <Eye size={12} /> View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const subject = isOffer ? `Re: Offer for ${(msg as any).carTitle}` : msg.reason
                      const body = encodeURIComponent('Thank you for contacting AutoMarket. We appreciate your message and will respond shortly.')
                      window.location.href = `mailto:${msg.email}?subject=${encodeURIComponent(subject)}&body=${body}`
                    }}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontFamily: 'Outfit', fontSize: '0.8rem',
                      border: '1px solid #f59e0b', color: '#f59e0b', backgroundColor: 'transparent', cursor: 'pointer',
                    }}
                  >
                    Reply
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleRead(msg) }}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontFamily: 'Outfit', fontSize: '0.8rem',
                      border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', backgroundColor: 'transparent', cursor: 'pointer',
                    }}
                  >
                    {msg.read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontFamily: 'Outfit', fontSize: '0.8rem',
                      border: '1px solid rgba(220,38,38,0.4)', color: '#ef4444', backgroundColor: 'transparent', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMessage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '5vh',
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#111111',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '1.25rem',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                padding: '1.5rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                borderBottom: '1px solid rgba(245,158,11,0.2)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '0.375rem',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'black', fontSize: '0.75rem', fontWeight: 600,
                    fontFamily: 'Outfit', marginBottom: '0.75rem', textTransform: 'uppercase',
                  }}>
                    {selectedMessage.type === 'offer' ? 'OFFER' : selectedMessage.type === 'contact' ? 'CONTACT' : 'FINANCING'}
                  </div>
                  <p className="font-bebas" style={{
                    fontSize: '1.5rem', color: 'black', lineHeight: 1,
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
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.2)', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'black',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '2rem' }}>
                {selectedMessage.type === 'offer' ? (
                  <>
                    {/* Offer Details */}
                    <div style={{ marginBottom: '2rem' }}>
                      <p className="font-bebas" style={{
                        fontSize: '1.5rem', color: '#f59e0b', marginBottom: '0.5rem',
                      }}>
                        {(selectedMessage as any).carTitle || 'Vehicle'}
                      </p>
                      <p className="font-bebas" style={{
                        fontSize: '2.5rem', color: '#f59e0b', marginBottom: '0.5rem',
                      }}>
                        {fmt((selectedMessage as any).offerPrice || 0)}
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>
                        Listed at {fmt((selectedMessage as any).carPrice || 0)}
                      </p>
                      {(selectedMessage as any).offerPrice < (selectedMessage as any).carPrice ? (
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(239,68,68,0.6)' }}>
                          {fmt(((selectedMessage as any).carPrice || 0) - ((selectedMessage as any).offerPrice || 0))} below asking price
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(34,197,94,0.6)' }}>
                          At or above asking price
                        </p>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>First Name</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{(selectedMessage as any).firstName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Last Name</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{(selectedMessage as any).lastName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{selectedMessage.email}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phone</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{(selectedMessage as any).phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    {selectedMessage.message && (
                      <div>
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: '#f59e0b', marginBottom: '0.75rem' }}>Note from buyer</p>
                        <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                          {selectedMessage.message}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Contact Info */}
                    <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Name</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{selectedMessage.senderName}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Email</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{selectedMessage.email}</p>
                        </div>
                        {selectedMessage.phone && (
                          <div>
                            <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phone</p>
                            <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{selectedMessage.phone}</p>
                          </div>
                        )}
                        <div>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reason</p>
                          <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'white' }}>{selectedMessage.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Message</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                        {selectedMessage.message}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '1.5rem 2rem', borderTop: '1px solid rgba(245,158,11,0.1)',
                display: 'flex', gap: '0.75rem', flexDirection: 'column',
              }}>
                <button
                  onClick={() => {
                    const subject = selectedMessage.type === 'offer'
                      ? `Re: Offer for ${(selectedMessage as any).carTitle}`
                      : `Re: ${selectedMessage.reason}`
                    const body = encodeURIComponent('Thank you for contacting AutoMarket. We appreciate your message and will respond shortly.')
                    window.location.href = `mailto:${selectedMessage.email}?subject=${encodeURIComponent(subject)}&body=${body}`
                  }}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'black', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.875rem',
                    border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                  }}
                >
                  Reply via Email
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      handleToggleRead(selectedMessage)
                      setSelectedMessage(null)
                    }}
                    style={{
                      flex: 1, padding: '0.75rem 1rem',
                      backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontSize: '0.875rem',
                      borderRadius: '0.5rem', cursor: 'pointer',
                    }}
                  >
                    {selectedMessage.read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    style={{
                      flex: 1, padding: '0.75rem 1rem',
                      backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontSize: '0.875rem',
                      borderRadius: '0.5rem', cursor: 'pointer',
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
