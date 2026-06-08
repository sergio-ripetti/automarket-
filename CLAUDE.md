# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AutoMarket** is an automotive marketplace with an integrated AI assistant for business analytics. It's a full-stack application featuring a public-facing customer portal and a comprehensive admin dashboard.

The application is bilingual (Spanish/English) and includes real-time analytics, secure API authentication, persistent chat history, and Firebase/Firestore integration for data management.

## Tech Stack & Build

**Frontend:**
- React 19 with TypeScript
- Vite 8.0 (fast bundler with HMR)
- Tailwind CSS 4.3 (custom color palette: gold, dark, carbon, bone)
- Framer Motion 12 (page transitions & animations)
- React Router 7 (client-side routing)

**Backend:**
- Node.js / Express 5.2
- Runs on port 3001 (proxied via Vite at `/api`)

**Third-party APIs:**
- Anthropic Claude API (AI assistant)
- Firebase/Firestore (real-time data)
- Cloudinary (image hosting)
- API Ninjas (vehicle data enrichment)

### Development Commands

```bash
# Start both client and server with live reload (RECOMMENDED)
npm run dev

# Start client only (Vite on http://localhost:5173)
npm run dev:client

# Start server only (Express on http://localhost:3001)
npm run dev:server

# Build for production (compiles TypeScript + bundles with Vite)
npm run build

# Lint with ESLint (Flat config with React + TypeScript rules)
npm run lint

# Preview production build locally
npm run preview
```

**Note:** `npm run dev` runs both Vite (client on 5173) and Express (server on 3001) concurrently via the `concurrently` package. The server is proxied at `/api` and `/ninjas-api` during development via Vite's dev server proxy configuration.

## Project Structure

```
src/
├── pages/                    # Route-level components
│   ├── Home, Cars, CarDetail, Favourites (public pages)
│   └── admin/               # Protected admin dashboard pages
├── components/              # Reusable UI components
│   ├── admin/               # Admin-specific components (AdminLayout, ProtectedRoute, etc.)
│   ├── Navbar, Footer       # Layout components
│   ├── CarCard, FilterBar   # Feature-specific components
│   └── FinancingSimulator, SeedButton
├── context/                 # React Context (AuthContext for user state)
├── services/                # API integration layer
│   ├── carApi.ts           # Car service API calls
│   └── other *Service.ts   # Domain-specific services
├── lib/                     # Utility functions & configurations
│   ├── firebase.ts         # Firebase setup
│   ├── cloudinaryService.ts
│   ├── sanitize.ts         # Input sanitization
│   ├── invoiceService.ts   # PDF generation
│   └── other utilities
├── hooks/                   # Custom React hooks
│   ├── useCars.ts          # Car data management
│   └── useToast.ts         # Toast notifications
├── types/                   # TypeScript interfaces
│   └── index.ts            # Centralized type definitions (Car, FilterState, FinancingForm, etc.)
├── data/                    # Static data
│   ├── cars.ts            # Sample car data
│   └── cars-catalog.json  # Large car catalog
├── assets/                 # Images & static files
├── App.tsx                 # Main router & layout orchestrator
└── main.tsx                # App entry point
```

**Key Architectural Pattern:**
- The public app wraps content with `<Navbar />` and `<Footer />`
- Admin routes skip navbar/footer and render inside `<AdminLayout />`
- All transitions use Framer Motion's `<AnimatePresence />` with route-based animations
- `<ScrollToTop />` resets scroll position on navigation

## Design System

**Full design documentation:** See `DESIGN_SYSTEM.md` for comprehensive design tokens, component specs, migration guide, and accessibility details.

**Color Palette** (Tailwind config):
- `gold`: #f59e0b (primary accent, CTA buttons, focus indicators)
- `dark`: #0a0a0a (main background)
- `carbon`: #1a1a1a (secondary background, cards)
- `bone`: #f5f5f0 (text/contrast)
- Extended palette: Slate (neutrals), Emerald (success), Sky (info), Red (danger)

**Typography**:
- `bebas`: Bebas Neue (headlines, display text, section titles)
- `poppins`: Poppins (body text, forms, UI labels - 400/500/600/700 weights)
- `outfit`: Outfit (legacy fallback, transitioning out)

**Component Library** (`src/components/ui/`):
- `Button.tsx` — Variants (primary, secondary, outline, ghost, danger), sizes (sm/md/lg), loading state
- `Card.tsx` — Composable with CardHeader, CardBody, CardFooter; hoverable/interactive options
- `Input.tsx` — Form inputs with labels, error states, helper text, icon support
- `Badge.tsx` — Semantic badges with color variants (success, danger, warning, info, gold)

**Animation Patterns**:
- **Page transitions**: 300ms, y-axis movement for public pages (12px down/out), no offset for admin pages
- **Hover effects**: 200ms, scale/shadow changes
- **List animations**: Stagger with 80ms delay
- All transitions via Framer Motion's `<AnimatePresence />` with route-based keys

**Styling Approach**: Tailwind utility classes first; extend theme in `tailwind.config.js` for custom colors and spacings (4px base unit).

## Authentication & Security

**Admin Authentication:**
- **Firebase Authentication** (UI): Admin login at `/admin/login` uses Firebase user credentials
- **AuthContext** (`src/context/AuthContext`) manages user login state and provides auth headers
- **ProtectedRoute** wrapper (`src/components/admin/ProtectedRoute`) prevents unauthorized access to `/admin/*` pages
- Requires Firebase user to be signed in; unauthenticated users redirected to login

**API Authentication:**
- All `/api/*` requests require `x-api-key` header (validated against `AI_ASSISTANT_API_KEY`)
- Server returns 401 Unauthorized if key is missing or invalid
- AuthContext passes the key automatically with API calls

**Sensitive Data**:
- API keys in `.env` (VITE_ANTHROPIC_API_KEY, AI_ASSISTANT_API_KEY, VITE_CARAPI_TOKEN)
- Never commit `.env` files (listed in `.gitignore`)
- Anthropic API key used for server-side chat completion
- API Ninjas key is injected server-side via Vite proxy (not exposed to client)

**CORS & Proxy**:
- Express CORS middleware allows all origins on server
- Vite dev server proxies `/api` → localhost:3001 and `/ninjas-api` → api-ninjas.com
- Vite proxy injects API Ninjas header automatically

## Data Flow & Key Services

**Car Management**:
- `useCars()` hook fetches from `carApi.ts`
- Types: `Car` interface with fields for brand, model, price, images, transmission, fuel, etc.
- `FilterState` manages search/filter UI state
- Favorites stored in localStorage
- Firestore collection: `cars` (auto-saves from admin panel)

**Financing**:
- `FinancingForm` interface defines structure (personal info, employment, documents, consent)
- `financingService.ts` handles form submissions
- Document upload via Cloudinary
- Firestore collection: `financing` (auto-saves with status tracking: Pending, Approved, Rejected, Paying, Completed)

**Sales**:
- Firestore collection: `sales` (tracks completed transactions with buyer details, payment method, sale date)
- Each sale references a car by `carId`

**Messages**:
- Firestore collection: `messages` (contact form & financing inquiries, read/unread status)
- Can filter by type and read status

**Admin Dashboard**:
- Separate routes under `/admin/*` with `<ProtectedRoute>` wrapper
- Protected by Firebase Authentication (requires admin user login)
- AdminCars, AdminSales, AdminMessages, AdminAI (AI analytics)
- Admin can add/edit/delete cars, manage financing applications, process sales, view customer messages
- All forms save directly to Firestore with real-time updates
- Uses localStorage for temporary state (favorites, chat history)

**AI Assistant**:
- Accessible via `/admin/ai` page (AdminAI component)
- Server-side: Uses Anthropic SDK for chat completion with business context
- Client-side: Chat history saved to localStorage
- System prompt includes business stats (total cars, sales, revenue, financing requests, recent sales data)

## API & Server

**Endpoints:**
- `GET /health` — Server health check
- `POST /api/aiAssistant` — AI chat endpoint (requires `x-api-key` header)

**API Key Validation:**
All `/api/*` requests are validated against `AI_ASSISTANT_API_KEY` (server-side). The key is passed as `x-api-key` header from the client. Fallback handling: if `AI_ASSISTANT_API_KEY` is not set, the server defaults to `'test-key-123'`.

**AI Endpoint Details:**
- Uses Anthropic's `claude-opus-4-8` model
- Accepts `message`, `businessContext`, and `conversationHistory`
- System prompt includes business stats and recent sales data
- Responds in Spanish
- Max tokens: 1024

## Important File Locations

- **Server entry**: `server.js` (Express app, `/api` endpoints, health check)
- **Router config**: `src/App.tsx` (all routes, Framer Motion animations)
- **Type definitions**: `src/types/index.ts` (Car, FinancingForm, OfferForm, FilterState)
- **Firebase config**: `src/lib/firebase.ts`
- **Tailwind theme**: `tailwind.config.js` (custom colors, spacing, shadows)
- **Vite config**: `vite.config.ts` (proxy for `/api` and `/ninjas-api`, API Ninjas key injection)
- **Design system**: `DESIGN_SYSTEM.md` (color palette, typography, component patterns)

## Common Development Workflows

**Adding a New Page**:
1. Create component in `src/pages/` (or `src/pages/admin/` for admin pages)
2. Import in `App.tsx` and add `<Route />`
3. For admin pages: wrap with `<ProtectedRoute><AdminLayout>...</AdminLayout></ProtectedRoute>`
4. Page transitions automatically handled by Framer Motion in `AnimatedRoutes` component
5. Note: Admin pages use `opacity` only (no y-offset); public pages animate with y-movement

**Adding a New Component**:
1. Create in `src/components/` (or `src/components/admin/` if admin-specific, or `src/components/ui/` for reusable UI)
2. Use Tailwind utility classes for styling; import components from `src/components/ui/` when available
3. Import types from `src/types/index.ts`
4. Use Framer Motion `motion.div` for animations when needed

**API Integration**:
1. Create service in `src/lib/` or `src/services/`
2. Use `AuthContext` for headers and API key if authentication needed (`.getAuthHeaders()`)
3. Server-side: routes require `validateApiKey` middleware for `/api/*` endpoints
4. Call from hooks or components; create custom hooks in `src/hooks/` for reuse

**Styling**:
- **Tailwind first**: Use utility classes and custom colors (gold, dark, carbon, bone)
- **Components**: Import from `src/components/ui/` (Button, Card, Input, Badge)
- **Animations**: Framer Motion for transitions; page transitions in 300ms, hover effects in 200ms
- **Responsive**: Mobile-first with breakpoints (sm:, md:, lg:, etc.)
- **Dark mode**: Already base-dark; use opacity modifiers (text-white/70) for contrast

## Environment Variables Required

```
VITE_ANTHROPIC_API_KEY=<Anthropic API key for frontend>
VITE_AI_ASSISTANT_API_KEY=<AI assistant server key for frontend>
ANTHROPIC_API_KEY=<Anthropic API key for backend>
AI_ASSISTANT_API_KEY=<AI assistant server key for backend>
```

Both client and server need keys; prefix with `VITE_` for client-side access in Vite.

## Key Architecture Notes

**Build & TypeScript:**
- Build pipeline: `npm run build` runs `tsc -b` (incremental TypeScript) then `vite build`
- TypeScript strict mode enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target ES2023; output ESNext modules via Vite

**Runtime Behavior:**
- Admin and public pages have different animation settings (admin: opacity only; public: y-movement)
- Vite proxy intercepts `/api/*` calls to localhost:3001 during dev
- API Ninjas requests proxied via Vite with custom header injection (X-Api-Key)
- Scroll-to-top on every route via `ScrollToTop` component in App.tsx
- `RouteChecker` determines whether to render navbar/footer based on route path

**Data Persistence:**
- Favorites stored in localStorage (public)
- Chat history saved to localStorage (admin AI page)
- Business data (cars, sales, financing, messages) stored in Firestore with real-time sync
- Firebase connection initialized in `src/lib/firebase.ts`; ensure .env has valid Firebase config

**Testing & Validation:**
- Responsive design critical; test on mobile viewports (use `sm:`, `md:`, `lg:` breakpoints)
- API key validation happens on server via `validateApiKey` middleware before route handler
- CORS is permissive in dev; tighten in production

**Common Gotchas:**
- Ensure both `VITE_ANTHROPIC_API_KEY` (frontend) and `ANTHROPIC_API_KEY` (backend) are set
- API Ninjas key is hardcoded in `vite.config.ts` proxy config (security caveat: consider env var in prod)
- Firebase must be initialized before routes render; check `src/lib/firebase.ts`
- Admin routes require both Firebase auth AND API key in headers (dual authentication)
