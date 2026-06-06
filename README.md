# AutoMarket - AI Assistant

A modern automotive marketplace with an intelligent AI assistant for business analytics.

## Features

- **AI-Powered Chat** - Interactive AI assistant for business insights
- **Real-time Analytics** - Inventory, sales, and financing data
- **Secure API** - Authentication with API keys
- **Persistent History** - Chat saved to localStorage
- **Multi-language** - Spanish/English support
- **Firebase Integration** - Real-time Firestore data

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Anthropic Claude API
- **Database**: Firebase/Firestore

## Getting Started

### Installation

\\\ash
npm install
\\\

### Configuration

Create .env:
\\\
VITE_ANTHROPIC_API_KEY=your_key
VITE_AI_ASSISTANT_API_KEY=your_server_key
ANTHROPIC_API_KEY=your_key
AI_ASSISTANT_API_KEY=your_server_key
\\\

### Run

\\\ash
npm run dev
\\\

## API Security

All API endpoints require authentication via x-api-key header.

## License

MIT
