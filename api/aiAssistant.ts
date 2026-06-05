import { VercelRequest, VercelResponse } from '@vercel/node'

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

interface RequestBody {
  message: string
  businessContext: BusinessContext
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

// Enable CORS headers
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', success: false })
  }

  try {
    const { message, businessContext, conversationHistory = [] } = req.body as RequestBody

    // Validate required fields
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required',
        success: false,
      })
    }

    if (!businessContext) {
      return res.status(400).json({
        error: 'Business context is required',
        success: false,
      })
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY environment variable not set')
      return res.status(500).json({
        error: 'API configuration error',
        success: false,
      })
    }

    // Build the system prompt with business data
    const systemPrompt = `You are AutoMarket AI Assistant, a helpful business intelligence assistant for an automotive dealership in New Zealand. You have access to the following real-time business data:

INVENTORY: ${businessContext.totalCars} cars in stock
- Available cars: ${businessContext.availableCars}
- Featured cars: ${businessContext.featuredCars}
- Cars on sale: ${businessContext.carsOnSale}
- Recent additions: ${businessContext.recentCars} (last 5 cars as JSON)

SALES: ${businessContext.totalSales} total sales recorded
- Total revenue: NZD ${new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(businessContext.totalRevenue)}
- Cash sales: ${businessContext.cashSales}
- Financed sales: ${businessContext.financedSales}
- Completed sales: ${businessContext.completedSales}
- Recent sales: ${businessContext.recentSalesJSON} (last 10 sales as JSON)

FINANCING: ${businessContext.totalFinancing} financing requests
- Pending: ${businessContext.pendingFinancing}
- Approved: ${businessContext.approvedFinancing}
- Active (paying): ${businessContext.activeFinancing}
- Recent requests: ${businessContext.recentFinancingJSON} (last 5 as JSON)

MESSAGES: ${businessContext.totalMessages} total messages
- Unread: ${businessContext.unreadMessages}
- Offers: ${businessContext.offerMessages}
- Contact inquiries: ${businessContext.contactMessages}

Today's date: ${new Date().toLocaleDateString('en-NZ')}

Answer questions about this business data in a helpful, professional manner. Format numbers as NZD currency where appropriate. Be concise but informative. If asked about specific customers or cars, reference the actual data provided.`

    // Build conversation history for context
    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Anthropic API error:', errorData)
      return res.status(response.status).json({
        error: errorData.error?.message || 'Failed to get response from AI',
        success: false,
      })
    }

    const data = await response.json()
    const reply = data.content[0]?.text || 'Sorry, I could not process your request.'

    return res.status(200).json({
      reply,
      success: true,
    })
  } catch (error) {
    console.error('Error in aiAssistant endpoint:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return res.status(500).json({
      error: errorMessage,
      success: false,
    })
  }
}
