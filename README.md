# AutoMarket - AI Assistant

A modern automotive marketplace with an intelligent AI assistant for business analytics. The app combines a public customer-facing storefront with a full admin dashboard, backed by Firebase/Firestore and a Claude-powered AI assistant.

## Features

- **AI-Powered Chat** - Interactive AI assistant for business insights, backed by the Anthropic Claude API
- **Real-time Analytics** - Inventory, sales, and financing data pulled live from Firestore
- **Secure API** - Authentication with API keys on every `/api/*` request
- **Persistent History** - Chat saved to localStorage
- **Admin Dashboard** - Complete management panel for cars, sales, financing applications, and customer messages
- **Firebase Integration** - Real-time Firestore data with Firebase Authentication for admin access
- **Document Uploads** - Financing/sale documents and images stored via Cloudinary
- **Vehicle Data Enrichment** - Car specs auto-filled via the CarAPI vehicle database

## Project Structure

This is a single React application that serves two experiences from one codebase:

- **Customer portal** (`src/pages/*.tsx`) - public storefront: home, car catalog, car details, financing simulator, contact, favourites
- **Admin dashboard** (`src/pages/admin/*.tsx`, `src/components/admin/*`) - protected by Firebase Authentication (`ProtectedRoute`, `AuthContext`); manages cars, sales, financing, messages, and the AI assistant
- **Backend** (`server.js`) - a small Express API that proxies chat requests to the Anthropic Claude API and validates the `x-api-key` header

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion
- **Backend**: Node.js, Express, Anthropic Claude API
- **Database**: Firebase / Firestore, Firebase Authentication
- **Other integrations**: Cloudinary (image/document hosting), CarAPI (vehicle data), jsPDF (invoice generation)

## Getting Started

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file (see `.env.example` for the full list):

```
VITE_ANTHROPIC_API_KEY=your_key
VITE_AI_ASSISTANT_API_KEY=your_server_key
ANTHROPIC_API_KEY=your_key
AI_ASSISTANT_API_KEY=your_server_key
VITE_CARAPI_TOKEN=your_carapi_token
VITE_CARAPI_SECRET=your_carapi_secret
VITE_API_BASE_URL=
```

### Run

```bash
npm run dev
```

This starts the Vite client (`http://localhost:5173`) and the Express API (`http://localhost:3001`) together via `concurrently`.

## API Security

All `/api/*` endpoints require authentication via the `x-api-key` header. Admin routes additionally require a signed-in Firebase user.

## License

MIT
