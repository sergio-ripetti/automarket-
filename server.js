import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Anthropic client
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
const serverApiKey = process.env.AI_ASSISTANT_API_KEY || 'test-key-123';

if (!anthropicKey) {
  console.error('❌ ANTHROPIC_API_KEY not configured');
  process.exit(1);
}

const client = new Anthropic({ apiKey: anthropicKey });

// Express middleware - checks the x-api-key header against AI_ASSISTANT_API_KEY and rejects unauthorized requests with a 401
const validateApiKey = (req, res, next) => {
  const key = req.headers['x-api-key'];
  console.log('🔑 API Key received:', key);
  console.log('🔑 API Key expected:', serverApiKey);
  console.log('🔑 Keys match?', key === serverApiKey);
  if (!key || key !== serverApiKey) {
    console.error('❌ Auth failed - Received:', key, 'Expected:', serverApiKey);
    return res.status(401).json({ success: false, error: 'Unauthorized - Invalid API key' });
  }
  console.log('✅ Auth passed');
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /api/aiAssistant - takes a chat message plus business context/history from the client, builds a system prompt with live business data, and forwards the conversation to the Anthropic Claude API
app.post('/api/aiAssistant', validateApiKey, async (req, res) => {
  try {
    const { message, businessContext, conversationHistory } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid message' });
    }

    // Build system prompt with business context
    let systemPrompt = 'Eres un asistente de IA para AutoMarket, un mercado automotriz. Tienes acceso COMPLETO a todos los datos del negocio.';

    if (businessContext) {
      systemPrompt += `\n\n=== DATOS DEL NEGOCIO ===\n`;
      systemPrompt += `Total de autos: ${businessContext.totalCars || 0} (${businessContext.availableCars || 0} disponibles)\n`;
      systemPrompt += `Ventas totales: ${businessContext.totalSales || 0}, Ingresos: $${businessContext.totalRevenue || 0}\n`;
      systemPrompt += `Financiamiento: ${businessContext.totalFinancing || 0}\n`;
      systemPrompt += `Mensajes: ${businessContext.totalMessages || 0}\n`;

      // Include recent sales data if available
      if (businessContext.recentSalesJSON) {
        try {
          const recentSales = JSON.parse(businessContext.recentSalesJSON);
          if (recentSales.length > 0) {
            systemPrompt += `\n=== VENTAS RECIENTES ===\n`;
            recentSales.forEach((sale, idx) => {
              systemPrompt += `${idx + 1}. ${sale.carBrand} ${sale.carModel} (${sale.carYear}) - ${sale.buyerName}\n`;
              systemPrompt += `   Teléfono: ${sale.buyerPhone || 'N/A'}, Email: ${sale.buyerEmail || 'N/A'}\n`;
            });
          }
        } catch (e) {
          // Skip if parsing fails
        }
      }
    }

    systemPrompt += `\n\nRespond in the same language the user is writing in. Be concise and specific.`;

    // Build messages array with conversation history
    let messages = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages = conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    messages.push({ role: 'user', content: message });

    // Call Anthropic API
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    });

    // Extract reply from response
    let reply = '';
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      reply = response.content[0].text;
    }

    res.json({ reply, success: true });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ AI Assistant API running on http://localhost:${PORT}`);
  console.log(`🔐 API Key protection: ${serverApiKey === 'dev-key-change-in-production' ? '⚠️ DEVELOPMENT MODE' : '✅ PRODUCTION'}`);
});
