# AutoMarket AI Assistant API

Serverless API endpoint for the AI Assistant built with Vercel Functions.

## Endpoints

### POST `/api/aiAssistant`

Processes natural language questions about business data and returns AI-generated responses.

**Request Body:**
```json
{
  "message": "How many cars have I sold?",
  "businessContext": {
    "totalCars": 50,
    "availableCars": 42,
    "featuredCars": 8,
    "carsOnSale": 3,
    "recentCars": "[...]",
    "totalSales": 15,
    "totalRevenue": 850000,
    "cashSales": 10,
    "financedSales": 5,
    "completedSales": 12,
    "recentSalesJSON": "[...]",
    "totalFinancing": 8,
    "pendingFinancing": 2,
    "approvedFinancing": 4,
    "activeFinancing": 2,
    "recentFinancingJSON": "[...]",
    "totalMessages": 45,
    "unreadMessages": 3,
    "offerMessages": 12,
    "contactMessages": 33
  },
  "conversationHistory": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

**Success Response:**
```json
{
  "reply": "You have sold 15 cars with a total revenue of NZD $850,000...",
  "success": true
}
```

**Error Response:**
```json
{
  "error": "Message is required",
  "success": false
}
```

## Environment Variables

Required environment variable in Vercel:
- `ANTHROPIC_API_KEY` - Your Anthropic API key from https://console.anthropic.com/

## Setup

1. Deploy this project to Vercel:
   ```bash
   vercel
   ```

2. Set the environment variable in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `ANTHROPIC_API_KEY` with your Anthropic API key

3. The API will be available at: `https://your-vercel-domain.vercel.app/api/aiAssistant`

## Local Development

To test locally:

```bash
# Install Vercel CLI
npm install -g vercel

# Run the dev server
vercel dev

# The API will be available at http://localhost:3000/api/aiAssistant
```

## Features

- ✅ POST-only endpoint with CORS support
- ✅ Request validation (message and businessContext required)
- ✅ Secure API key handling (server-side only)
- ✅ Conversation history support for context continuity
- ✅ Real-time business data integration
- ✅ Error handling and logging
- ✅ Claude Haiku model for fast, cost-effective responses
