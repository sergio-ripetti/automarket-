import { useEffect, useState, useRef } from 'react'
import { Send, Bot, Trash2 } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  id?: string
}

interface BusinessContext {
  totalCars: number
  availableCars: number
  featuredCars: number
  carsOnSale: number
  recentCars: string
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
    // Fetch all collections in parallel
    const [carsSnap, salesSnap, financingSnap, messagesSnap] = await Promise.all([
      getDocs(collection(db, 'cars')),
      getDocs(collection(db, 'sales')),
      getDocs(collection(db, 'financing')),
      getDocs(collection(db, 'messages')),
    ])

    const cars = carsSnap.docs.map((d) => d.data())
    const sales = salesSnap.docs.map((d) => d.data())
    const financing = financingSnap.docs.map((d) => d.data())
    const messages = messagesSnap.docs.map((d) => d.data())

    const availableCars = cars.filter((c: any) => !c.isOnSale).length
    const featuredCars = cars.filter((c: any) => c.featured).length
    const carsOnSaleCount = cars.filter((c: any) => c.isOnSale).length
    const recentCarsArray = cars.slice(-5).map((c: any) => ({
      title: c.title, brand: c.brand, model: c.model, year: c.year, price: c.price,
    }))

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.paymentPlan?.salePrice || 0), 0)
    const cashSalesCount = sales.filter((s: any) => s.paymentPlan?.type === 'cash').length
    const financedSalesCount = sales.filter((s: any) => s.paymentPlan?.type === 'financing').length
    const completedSalesCount = sales.filter((s: any) => s.status === 'completed').length
    const recentSalesArray = sales.slice(-10).map((s: any) => ({
      carTitle: s.carTitle,
      carBrand: s.carBrand,
      carModel: s.carModel,
      carYear: s.carYear,
      buyerName: s.buyer?.name,
      buyerPhone: s.buyer?.phone,
      buyerEmail: s.buyer?.email,
      buyerAddress: s.buyer?.address,
      buyerLicense: s.buyer?.licenseNumber,
      salePrice: s.paymentPlan?.salePrice,
      paymentType: s.paymentPlan?.type,
      downPayment: s.paymentPlan?.downPayment,
      createdAt: s.createdAt,
    }))

    const pendingFinancingCount = financing.filter((f: any) => f.status === 'pending').length
    const approvedFinancingCount = financing.filter((f: any) => f.status === 'approved').length
    const activeFinancingCount = financing.filter((f: any) => f.status === 'active').length
    const recentFinancingArray = financing.slice(-5).map((f: any) => ({
      name: `${f.firstName} ${f.lastName}`, carTitle: f.carTitle, totalAmount: f.totalAmount, status: f.status,
    }))

    const unreadMessagesCount = messages.filter((m: any) => !m.read).length
    const offerMessagesCount = messages.filter((m: any) => m.type === 'offer').length
    const contactMessagesCount = messages.filter((m: any) => m.type === 'contact').length

    return {
      totalCars: cars.length,
      availableCars,
      featuredCars,
      carsOnSale: carsOnSaleCount,
      recentCars: JSON.stringify(recentCarsArray),
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
    return {
      totalCars: 0, availableCars: 0, featuredCars: 0, carsOnSale: 0, recentCars: '[]',
      totalSales: 0, totalRevenue: 0, cashSales: 0, financedSales: 0, completedSales: 0, recentSalesJSON: '[]',
      totalFinancing: 0, pendingFinancing: 0, approvedFinancing: 0, activeFinancing: 0, recentFinancingJSON: '[]',
      totalMessages: 0, unreadMessages: 0, offerMessages: 0, contactMessages: 0,
    }
  }
}

const suggestionQuestions = [
  'How many cars have I sold?',
  'What is my total revenue?',
  'Show me pending financing requests',
  'Which cars are still available?',
  'Who are my recent buyers?',
  'What was sold this month?',
  'How many cars are in inventory?',
  'Show me unread messages',
]

// Admin AI Assistant chat page - lets the admin ask questions about business data; fetches Firestore stats for context and sends messages to the Claude AI backend
export default function AdminAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Logs message list changes for debugging and auto-scrolls chat to the latest message
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('📊 Messages state updated:', messages.length, 'messages')
      messages.forEach((m, i) => {
        console.log(`  ${i}: ${m.role} - ${m.content.substring(0, 30)}...`)
      })
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

      if (import.meta.env.DEV) {
        console.log('📤 Enviando datos al servidor:')
        console.log('  - Mensaje:', userMessage.content.substring(0, 50))
        console.log('  - Business Context:', JSON.stringify(context, null, 2))
        if (context.recentSalesJSON) {
          try {
            const sales = JSON.parse(context.recentSalesJSON)
            console.log('  - Ventas recientes:', sales.length, 'sales')
            sales.forEach((s: any, i: number) => {
              console.log(`    ${i + 1}. ${s.carBrand} ${s.carModel} - Comprador: ${s.buyerName}`)
            })
          } catch (e) {
            console.log('  - Error al parsear recentSalesJSON')
          }
        }
      }

      // Send request to AI Assistant API with authentication
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
      const response = await fetch(`${apiBaseUrl}/aiAssistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_AI_ASSISTANT_API_KEY || 'test-key-123',
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
        console.error('❌ API returned error status:', response.status);
        console.error('❌ Raw error response:', responseText.substring(0, 500));
        let errorMessage = `Server error: ${response.status}`;
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.error || errorMessage;
        } catch (jsonError) {
          errorMessage = `Server error (${response.status}): ${responseText.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Failed to parse successful response as JSON');
        console.error('❌ Raw response:', responseText.substring(0, 500));
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        id: Date.now() + '-assistant',
      }

      if (import.meta.env.DEV) {
        console.log('✅ Assistant message added:', assistantMessage)
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error:', err)
      }
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Sorry, I couldn\'t process your request. Please try again.',
        timestamp: new Date(),
        id: Date.now() + '-error',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
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
    }
  }

  // Loads previously saved chat messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('aiAssistantMessages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        const messagesWithDates = parsed.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined
        }))
        setMessages(messagesWithDates)
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Error loading messages:', e)
        }
      }
    }
    setIsLoadingContext(false)
  }, [])

  // Persists messages to localStorage whenever the chat history changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aiAssistantMessages', JSON.stringify(messages))
    }
  }, [messages])

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
        {isLoadingContext ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              color: '#767676',
            }}>
              <Bot size={32} />
              <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem' }}>Loading AI Assistant...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
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
