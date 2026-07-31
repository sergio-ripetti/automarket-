import { useEffect, useState, useRef } from 'react'
import { Send, Bot, Trash2 } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { authenticatedFetch } from '../../lib/authService'
import { apiUrl, parseJsonResponse } from '../../lib/apiClient'
import { loadAIConversation, saveAIConversation, clearAIConversation, type ChatMessage } from '../../lib/aiConversationStorage'
import { getSoldCarIds, getSales } from '../../lib/salesService'
import { getMessages } from '../../lib/messagesService'
import type { Car } from '../../types'

// Upper bound on how many available-vehicle records are sent to the AI in one request. The
// project currently has ~50 cars (well under this), but the cap keeps the prompt bounded if
// inventory grows; anything beyond it is dropped (not silently - isInventoryTruncated/
// availableVehicleCount/vehiclesIncludedInContext report the true counts to both the AI and,
// if needed, the admin).
const MAX_INVENTORY_VEHICLES_IN_CONTEXT = 150

const fuelDisplayLabel: Record<Car['fuel'], string> = {
  gasolina: 'Petrol',
  diesel: 'Diesel',
  electrico: 'Electric',
  hibrido: 'Hybrid',
}

const transmissionDisplayLabel: Record<Car['transmission'], string> = {
  manual: 'Manual',
  automatico: 'Automatic',
}

// A single available vehicle's AI-safe fields only - no images, description, ownerDescription,
// VIN/licence plate (Car has none), or any other internal/admin-only data.
interface AvailableVehicleContext {
  id: string
  title: string
  brand: string
  model: string
  year: number
  price: number
  km: number
  fuel: string
  transmission: string
  featured: boolean
  onSale: boolean
}

interface BusinessContext {
  totalCars: number
  availableCars: number
  featuredCars: number
  carsOnSale: number
  recentCars: string
  soldCars: number
  featuredAvailableCars: number
  onSaleAvailableCars: number
  availableVehicleCount: number
  vehiclesIncludedInContext: number
  isInventoryTruncated: boolean
  availableVehiclesJSON: string
  totalSales: number
  totalRevenue: number
  cashSales: number
  financedSales: number
  completedSales: number
  recentSalesJSON: string
  totalFinancing: number
  pendingFinancing: number
  approvedFinancing: number
  activeFinancing: number
  recentFinancingJSON: string
  totalMessages: number
  unreadMessages: number
  offerMessages: number
  contactMessages: number
}

// Fetch business data from Firebase for AI context
async function getBusinessContext(): Promise<BusinessContext> {
  try {
    // Fetch all data sources in parallel. Sales/Messages can no longer be read directly from
    // client-side Firestore (firestore.rules denies all client access to both collections - they
    // can carry buyer/sender PII), so these go through getSales()/getMessages()
    // (src/lib/{sales,messages}Service.ts), which call the authenticated GET /api/sales and
    // GET /api/messages backend endpoints. cars remains a direct read since that collection
    // still allows public Firestore reads (no PII).
    const [carsSnap, sales, financingRes, messages] = await Promise.all([
      getDocs(collection(db, 'cars')),
      getSales(),
      authenticatedFetch('/api/financing/applications').then((r) => parseJsonResponse<{ success: boolean; applications?: Array<Record<string, unknown>> }>(r)),
      getMessages(),
    ])

    const cars = carsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Car))
    const financing = financingRes.success ? (financingRes.applications || []) : ([] as Array<Record<string, unknown>>)

    // Reuses the same centralized sold-status source of truth as Admin Inventory, Record New
    // Sale, and the public Home/Cars pages (Sale.status !== 'cancelled' => sold) instead of the
    // unrelated `isOnSale` promotional-discount flag that was previously (incorrectly) used here.
    const soldCarIds = getSoldCarIds(sales)
    const availableCarsList = cars.filter((c) => c.id && !soldCarIds.has(c.id))

    const featuredCars = cars.filter((c) => c.featured).length
    const carsOnSaleCount = cars.filter((c) => c.isOnSale).length
    const recentCarsArray = cars.slice(-5).map((c) => ({
      title: c.title, brand: c.brand, model: c.model, year: c.year, price: c.price,
    }))

    const sortedAvailableVehicles = [...availableCarsList].sort((a, b) => a.title.localeCompare(b.title))
    const isInventoryTruncated = sortedAvailableVehicles.length > MAX_INVENTORY_VEHICLES_IN_CONTEXT
    const availableVehicles: AvailableVehicleContext[] = sortedAvailableVehicles
      .slice(0, MAX_INVENTORY_VEHICLES_IN_CONTEXT)
      .map((c) => ({
        id: c.id,
        title: c.title,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        km: c.km,
        fuel: fuelDisplayLabel[c.fuel] || c.fuel,
        transmission: transmissionDisplayLabel[c.transmission] || c.transmission,
        featured: Boolean(c.featured),
        onSale: Boolean(c.isOnSale),
      }))

    const totalRevenue = sales.reduce((sum: number, s) => sum + (s.paymentPlan?.salePrice || 0), 0)
    const cashSalesCount = sales.filter((s) => s.paymentPlan?.type === 'cash').length
    const financedSalesCount = sales.filter((s) => s.paymentPlan?.type === 'financing').length
    const completedSalesCount = sales.filter((s) => s.status === 'completed').length
    // Only business fields the AI prompt actually uses - no buyer name/email/phone/address/ID or
    // licence number is ever included here, so it never leaves the browser in the first place
    // (the backend's parseRecentSales also strips any such field defensively if somehow present).
    const recentSalesArray = sales.slice(-10).map((s) => ({
      carTitle: s.carTitle,
      carBrand: s.carBrand,
      carModel: s.carModel,
      carYear: s.carYear,
      salePrice: s.paymentPlan?.salePrice,
      paymentType: s.paymentPlan?.type,
      downPayment: s.paymentPlan?.downPayment,
      status: s.status,
      createdAt: s.createdAt,
    }))

    const pendingFinancingCount = financing.filter((f: Record<string, unknown>) => f.status === 'pending').length
    const approvedFinancingCount = financing.filter((f: Record<string, unknown>) => f.status === 'approved').length
    const activeFinancingCount = financing.filter((f: Record<string, unknown>) => f.status === 'paying').length
    const recentFinancingArray = financing.slice(-5).map((f: Record<string, unknown>) => ({
      name: `${f.firstName} ${f.lastName}`, carTitle: f.carTitle, totalAmount: f.totalAmount, status: f.status,
    }))

    const unreadMessagesCount = messages.filter((m) => !m.read).length
    const offerMessagesCount = messages.filter((m) => m.type === 'offer').length
    const contactMessagesCount = messages.filter((m) => m.type === 'contact').length

    return {
      totalCars: cars.length,
      availableCars: availableCarsList.length,
      featuredCars,
      carsOnSale: carsOnSaleCount,
      recentCars: JSON.stringify(recentCarsArray),
      soldCars: soldCarIds.size,
      featuredAvailableCars: availableCarsList.filter((c) => c.featured).length,
      onSaleAvailableCars: availableCarsList.filter((c) => c.isOnSale).length,
      availableVehicleCount: sortedAvailableVehicles.length,
      vehiclesIncludedInContext: availableVehicles.length,
      isInventoryTruncated,
      availableVehiclesJSON: JSON.stringify(availableVehicles),
      totalSales: sales.length,
      totalRevenue,
      cashSales: cashSalesCount,
      financedSales: financedSalesCount,
      completedSales: completedSalesCount,
      recentSalesJSON: JSON.stringify(recentSalesArray),
      totalFinancing: financing.length,
      pendingFinancing: pendingFinancingCount,
      approvedFinancing: approvedFinancingCount,
      activeFinancing: activeFinancingCount,
      recentFinancingJSON: JSON.stringify(recentFinancingArray),
      totalMessages: messages.length,
      unreadMessages: unreadMessagesCount,
      offerMessages: offerMessagesCount,
      contactMessages: contactMessagesCount,
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Error fetching business context:', err)
    }
    // Re-throw rather than silently returning an all-zero context: a failed business-context
    // fetch (e.g. a Firestore permission error, a network failure) must never be presented to the
    // AI as if it were real data - that previously produced a confidently wrong answer like
    // "0 cars sold" instead of a visible error. handleSendMessage's existing catch block turns
    // this into a controlled assistant error message instead of sending a request at all.
    throw new Error('Unable to load current business data. Please try again.', { cause: err })
  }
}

const suggestionQuestions = [
  "How many cars have I sold?",
  "What is my total revenue?",
  "How many vehicles are available, sold and featured?",
  "Which cars are still available?",
  "What is the average sale price?",
  "What was sold this month?",
  "How many cars are in inventory?",
  "Which cars are currently on sale?",
];

// Admin AI Assistant chat page - lets the admin ask questions about business data; fetches Firestore stats for context and sends messages to the Claude AI backend
export default function AdminAI() {
  // Lazy initializer restores any conversation saved earlier in this tab session, so navigating
  // to another admin page and back (which unmounts/remounts this component) does not lose it.
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadAIConversation())
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Guards state updates in handleSendMessage against firing after the component has unmounted
  // mid-request (e.g. the admin navigates away while waiting on the AI response)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  // First scroll (covers a restored conversation) jumps straight to the bottom instead of
  // animating through the whole history; later ones (new messages arriving) scroll smoothly.
  const hasScrolledOnceRef = useRef(false)

  // Keeps sessionStorage in sync with the visible conversation, and auto-scrolls to the latest
  // message. An empty conversation removes the stored key entirely rather than persisting "[]",
  // so Clear (and a session that never had messages) both leave no key behind.
  useEffect(() => {
    if (messages.length === 0) {
      clearAIConversation()
    } else {
      saveAIConversation(messages)
    }
    messagesEndRef.current?.scrollIntoView({ behavior: hasScrolledOnceRef.current ? 'smooth' : 'auto' })
    hasScrolledOnceRef.current = true
  }, [messages])

  // Fills the chat input with a preset suggestion question when clicked
  const handleSuggestionClick = (question: string) => {
    setInputValue(question)
  }

  // Handles sending the user's chat message - builds business context from Firestore, posts message + context + history to the AI Assistant API, and appends the reply
  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    // Create user message object
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      id: Date.now() + '-user',
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      const context = await getBusinessContext()

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Get current user from Firebase Auth
      const { auth } = await import('../../lib/firebase')
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Get Firebase ID token for this request
      const idToken = await currentUser.getIdToken(true)

      const response = await fetch(apiUrl('/api/aiAssistant'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          businessContext: context,
          conversationHistory,
        }),
      })

      // Get response text first (can only read body once)
      const responseText = await response.text();

      if (!response.ok) {
        // 429 is an expected, controlled condition (not a bug) - only log genuinely
        // unexpected failures to the console, and only in dev, to avoid noise.
        if (response.status !== 429 && import.meta.env.DEV) {
          console.error('❌ API returned error status:', response.status);
          console.error('❌ Raw error response:', responseText.substring(0, 500));
        }

        let errorMessage = `Server error: ${response.status}`;
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to use the AI assistant.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
          try {
            const error = JSON.parse(responseText);
            const retryAfter = typeof error.retryAfter === 'number' ? error.retryAfter : null;
            if (retryAfter && retryAfter > 0) {
              errorMessage = `Too many requests. Please wait ${retryAfter}s before trying again.`;
            }
          } catch {
            // Keep the default 429 message if the body isn't the expected JSON shape
          }
        } else {
          try {
            const error = JSON.parse(responseText);
            errorMessage = error.error || errorMessage;
          } catch {
            errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`;
          }
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (import.meta.env.DEV) {
          console.error('❌ Failed to parse successful response as JSON');
        }
        throw new Error('Invalid response from server');
      }
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        id: Date.now() + '-assistant',
      }

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error:', err)
      }
      if (isMountedRef.current) {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Sorry, I couldn\'t process your request. Please try again.',
          timestamp: new Date(),
          id: Date.now() + '-error',
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Submits the chat message when Enter is pressed without Shift
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Clears the entire chat history after user confirmation
  const handleClearConversation = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      setMessages([])
      clearAIConversation()
    }
  }

  return (
    <div id="admin-ai-main-container" className="admin-ai-main-container" style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)',
      backgroundColor: '#FFFFFF', width: '100%', maxWidth: '100%',
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <style>{`
        .admin-ai-main-container { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; }
        .admin-ai-input-wrapper { width: 100%; box-sizing: border-box; }
        .admin-ai-suggestions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
          max-width: 600px;
        }
        @media (min-width: 640px) {
          .admin-ai-suggestions { grid-template-columns: repeat(2, 1fr); }
        }
        .admin-ai-suggestion {
          width: 100%;
          text-align: left;
          white-space: normal;
          word-break: break-word;
          padding: clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.25rem) !important;
          font-size: clamp(0.75rem, 2vw, 0.875rem) !important;
        }
      `}</style>
      {/* Header */}
      <div id="admin-ai-header" className="admin-ai-header" style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #E0E0DC' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="font-bebas" style={{color: "#0D1B2A", lineHeight: 1, marginBottom: '0.25rem', fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>
              AI Assistant
            </h1>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#6B7280' }}>
              Ask anything about your business
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '0.75rem',
                backgroundColor: '#F9FAFB', border: '1px solid #E0E0DC',
                color: '#6B7280', fontFamily: 'Outfit', fontSize: '0.75rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6'
                e.currentTarget.style.color = '#1A1A1A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
                e.currentTarget.style.color = '#6B7280'
              }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div id="admin-ai-chat-wrapper" className="admin-ai-chat-wrapper" style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: '1rem', padding: '1.5rem',
      }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <Bot size={48} style={{ color: '#1A1A1A', opacity: 0.5, marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
              <h2 className="font-bebas" style={{color: "#0D1B2A", marginBottom: '0.5rem' }}>
                Hello! I'm your AI Assistant
              </h2>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: '#767676', maxWidth: '400px' }}>
                I can help you analyze your business data, answer questions about inventory, sales, financing, and more.
              </p>
            </div>

            <div>
              <p style={{
                fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676',
                marginBottom: '1rem', textAlign: 'center',
              }}>
                Try asking:
              </p>
              <div id="admin-ai-suggestions" className="admin-ai-suggestions" style={{ width: '100%', maxWidth: '600px' }}>
                {suggestionQuestions.map((question, idx) => (
                  <button
                    key={question}
                    id={`admin-ai-suggestion-${idx}`}
                    className={`admin-ai-suggestion admin-ai-suggestion-${idx}`}
                    onClick={() => handleSuggestionClick(question)}
                    style={{
                      backgroundColor: '#F0F9FF', border: '1px solid #BFDBFE',
                      borderRadius: '0.75rem', padding: '0.75rem 1rem',
                      color: '#1E40AF', fontFamily: 'Outfit', fontSize: '0.8rem',
                      cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#DBEAFE'
                      e.currentTarget.style.borderColor = '#93C5FD'
                      e.currentTarget.style.color = '#1E40AF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F0F9FF'
                      e.currentTarget.style.borderColor = '#BFDBFE'
                      e.currentTarget.style.color = '#1E40AF'
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div id="admin-ai-messages-list" className="admin-ai-messages-list" style={{ display: 'contents' }}>
            {messages.map((msg, idx) => (
              <div key={msg.id || msg.content} id={`admin-ai-message-${idx}`} className={`admin-ai-message admin-ai-message-${msg.role}`} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.75rem',
              }}>
                <div style={{
                  maxWidth: msg.role === 'user' ? '70%' : '80%',
                  backgroundColor: msg.role === 'user'
                    ? '#2563EB'
                    : '#F9FAFB',
                  border: msg.role === 'user' ? 'none' : '1px solid #E0E0DC',
                  color: msg.role === 'user' ? '#FFFFFF' : '#0D1B2A',
                  borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  padding: '0.875rem 1.25rem',
                  fontFamily: 'Outfit',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  boxShadow: msg.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                }}>
                  {msg.content}
                  {msg.timestamp && (
                    <p style={{
                      fontSize: '0.65rem',
                      color: msg.role === 'user' ? '#4A4A4A' : '#4A4A4A',
                      marginTop: '0.5rem',
                      marginBottom: 0,
                    }}>
                      {msg.timestamp.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  backgroundColor: '#F9FAFB', border: '1px solid #E0E0DC',
                  borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.875rem 1.25rem',
                  display: 'flex', gap: '0.4rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}>
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    animation: 'bounce 1.4s infinite',
                    opacity: 0.7,
                  }} />
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    animation: 'bounce 1.4s infinite 0.2s',
                    opacity: 0.7,
                  }} />
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: '#2563EB',
                    animation: 'bounce 1.4s infinite 0.4s',
                    opacity: 0.7,
                  }} />
                  <style>{`
                    @keyframes bounce {
                      0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
                      40% { transform: translateY(-8px); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Input Area */}
      <div id="admin-ai-input-wrapper" className="admin-ai-input-wrapper" style={{
        padding: 'clamp(0.75rem, 3vw, 1.5rem)', borderTop: '1px solid #E0E0DC',
        backgroundColor: '#FFFFFF', width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', gap: 'clamp(0.5rem, 2vw, 0.75rem)', width: '100%', boxSizing: 'border-box' }}>
          <input
            id="admin-ai-input-field"
            className="admin-ai-input-field"
            type="text"
            aria-label="Ask the AI Assistant a question"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={loading}
            style={{
              flex: 1, minWidth: 0, backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #E0E0DC',
              borderRadius: 0, padding: '0.75rem 0 0.5rem 0',
              color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.875rem',
              outline: 'none', transition: 'border-bottom-color 0.2s, border-width 0.2s', width: '100%', boxSizing: 'border-box',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => {
              if (!loading) {
                e.currentTarget.style.borderBottomColor = '#1A1A1A'
                e.currentTarget.style.borderBottomWidth = '2px'
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = '#E0E0DC'
              e.currentTarget.style.borderBottomWidth = '1px'
            }}
          />
          <button
            id="admin-ai-send-button"
            className="admin-ai-send-button"
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim()}
            style={{
              padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(0.875rem, 2vw, 1.25rem)',
              borderRadius: '0.75rem', minWidth: '44px', flexShrink: 0,
              background: loading || !inputValue.trim()
                ? '#F3F4F6'
                : '#2563EB',
              color: loading || !inputValue.trim() ? '#9CA3AF' : '#FFFFFF',
              fontWeight: 600, fontFamily: 'Outfit', fontSize: '0.875rem',
              border: '1px solid ' + (loading || !inputValue.trim() ? '#E5E7EB' : '#2563EB'),
              cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s', boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              if (!loading && inputValue.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
