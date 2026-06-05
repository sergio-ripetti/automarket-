import { useEffect, useState, useRef } from 'react'
import { Send, Bot, Trash2 } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
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

async function getBusinessContext(): Promise<BusinessContext> {
  try {
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
      carTitle: s.carTitle, buyer: s.buyer?.name, salePrice: s.paymentPlan?.salePrice, type: s.paymentPlan?.type,
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
    console.error('Error fetching business context:', err)
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

export default function AdminAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestionClick = (question: string) => {
    setInputValue(question)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      const context = await getBusinessContext()

      const systemPrompt = `You are AutoMarket AI Assistant, a helpful business intelligence assistant for an automotive dealership in New Zealand. You have access to the following real-time business data:

INVENTORY: ${context.totalCars} cars in stock
- Available cars: ${context.availableCars}
- Featured cars: ${context.featuredCars}
- Cars on sale: ${context.carsOnSale}
- Recent additions: ${context.recentCars} (last 5 cars as JSON)

SALES: ${context.totalSales} total sales recorded
- Total revenue: NZD ${context.totalRevenue.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })}
- Cash sales: ${context.cashSales}
- Financed sales: ${context.financedSales}
- Completed sales: ${context.completedSales}
- Recent sales: ${context.recentSalesJSON} (last 10 sales as JSON)

FINANCING: ${context.totalFinancing} financing requests
- Pending: ${context.pendingFinancing}
- Approved: ${context.approvedFinancing}
- Active (paying): ${context.activeFinancing}
- Recent requests: ${context.recentFinancingJSON} (last 5 as JSON)

MESSAGES: ${context.totalMessages} total messages
- Unread: ${context.unreadMessages}
- Offers: ${context.offerMessages}
- Contact inquiries: ${context.contactMessages}

Today's date: ${new Date().toLocaleDateString('en-NZ')}

Answer questions about this business data in a helpful, professional manner. Format numbers as NZD currency where appropriate. Be concise but informative. If asked about specific customers or cars, reference the actual data provided.`

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      conversationHistory.push({ role: 'user', content: userMessage.content })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: conversationHistory,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API error:', error)
        throw new Error(error.error?.message || 'Failed to get response from AI')
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.content[0]?.text || 'Sorry, I could not process your request.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error:', err)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Sorry, I couldn\'t process your request. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearConversation = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      setMessages([])
    }
  }

  useEffect(() => {
    setIsLoadingContext(false)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)',
      backgroundColor: '#0f0f0f',
    }}>
      {/* Header */}
      <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="font-bebas" style={{ fontSize: '2rem', color: 'white', lineHeight: 1, marginBottom: '0.25rem' }}>
              AI Assistant
            </h1>
            <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
              Ask anything about your business
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit', fontSize: '0.75rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }}
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: '1rem', padding: '1.5rem',
      }}>
        {isLoadingContext ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              color: 'rgba(255,255,255,0.4)',
            }}>
              <Bot size={32} />
              <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem' }}>Loading AI Assistant...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <Bot size={48} style={{ color: '#f59e0b', opacity: 0.5, marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
              <h2 className="font-bebas" style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
                Hello! I'm your AI Assistant
              </h2>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px' }}>
                I can help you analyze your business data, answer questions about inventory, sales, financing, and more.
              </p>
            </div>

            <div>
              <p style={{
                fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)',
                marginBottom: '1rem', textAlign: 'center',
              }}>
                Try asking:
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', maxWidth: '600px',
              }}>
                {suggestionQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => handleSuggestionClick(question)}
                    style={{
                      backgroundColor: '#1a1a1a', border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: '2rem', padding: '0.5rem 1.25rem',
                      color: 'rgba(255,255,255,0.7)', fontFamily: 'Outfit', fontSize: '0.75rem',
                      cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f59e0b'
                      e.currentTarget.style.color = '#f59e0b'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
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
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '0.75rem',
              }}>
                <div style={{
                  maxWidth: msg.role === 'user' ? '70%' : '80%',
                  backgroundColor: msg.role === 'user'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : '#1a1a1a',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: msg.role === 'user' ? 'black' : 'white',
                  borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  padding: '0.875rem 1.25rem',
                  fontFamily: 'Outfit',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                  {msg.timestamp && (
                    <p style={{
                      fontSize: '0.7rem',
                      color: msg.role === 'user' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)',
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
                  backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.875rem 1.25rem',
                  display: 'flex', gap: '0.4rem',
                }}>
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    animation: 'bounce 1.4s infinite',
                  }} />
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    animation: 'bounce 1.4s infinite 0.2s',
                  }} />
                  <span style={{
                    width: '0.5rem', height: '0.5rem', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    animation: 'bounce 1.4s infinite 0.4s',
                  }} />
                  <style>{`
                    @keyframes bounce {
                      0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
                      40% { transform: translateY(-8px); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: '#0f0f0f',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={loading}
            style={{
              flex: 1, backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem', padding: '0.875rem 1.25rem',
              color: 'white', fontFamily: 'Outfit', fontSize: '0.875rem',
              outline: 'none', transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#f59e0b'
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !inputValue.trim()}
            style={{
              padding: '0.875rem 1.25rem', borderRadius: '0.75rem',
              background: loading || !inputValue.trim()
                ? 'rgba(245,158,11,0.3)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: loading || !inputValue.trim() ? 'rgba(0,0,0,0.3)' : 'black',
              fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.875rem',
              border: 'none', cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading && inputValue.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
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
