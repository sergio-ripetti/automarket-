# AutoMarket 🚗

A professional full-stack automotive marketplace platform with AI-driven business analytics, real-time inventory management, and comprehensive admin controls built with React, TypeScript, Firebase, and Node.js.

**[Live Demo](https://automarket-ten.vercel.app)** | **[GitHub Repository](https://github.com/yourusername/automarket)**

---

## 📋 Overview

AutoMarket is a complete automotive marketplace solution designed for dealership owners and sales teams. It provides a modern, responsive customer portal for browsing vehicles and applying for financing, combined with a powerful admin dashboard for managing inventory, sales, customer communications, and AI-assisted business analytics.

The platform demonstrates full-stack engineering best practices including secure API authentication, privacy-conscious data handling, real-time database operations, and professional component architecture.

---

## ✨ Key Features

### Public Customer Portal
- **Vehicle Catalog** - Browse vehicles with advanced filtering (brand, price, year, fuel type, transmission)
- **Detailed Listings** - High-quality images, specs, and specifications
- **Favorites System** - Save vehicles with cross-session persistence
- **Financing Calculator** - Real-time loan calculations with adjustable terms
- **Contact Forms** - Direct messaging and financing inquiries

### Admin Dashboard
- **Inventory Management** - Add, edit, archive vehicles with bulk image upload
- **Sales Management** - Create complex multi-step sales with full financial tracking
- **Financing Workflow** - Review and approve financing applications with status tracking
- **Customer Communications** - Message inbox with read/unread status
- **Business Analytics** - Real-time dashboard with key metrics (sales, revenue, inventory)
- **AI Assistant** - Claude-powered business insights with secure, privacy-respecting data handling
- **PDF Invoices** - Professional invoice generation with detailed financial breakdowns

### Security & Privacy
- **Firebase Authentication** - Secure admin login with role-based access
- **API Key Validation** - Server-side request authentication with rate limiting
- **Privacy-First Design** - No customer PII logged or sent to external services
- **CORS Protection** - Restricted cross-origin access
- **Data Anonymization** - Customer data excluded from AI prompts

---

## 🏗️ Technology Stack

### Frontend
- **React 19** - Modern component architecture with hooks
- **TypeScript** - Full type safety with ESLint compliance
- **Vite** - Lightning-fast development server and optimized bundling
- **Tailwind CSS** - Responsive utility-first styling
- **Framer Motion** - Smooth page transitions and animations
- **React Router** - Client-side navigation

### Backend
- **Node.js + Express 5** - Lightweight, scalable server
- **Firebase/Firestore** - Real-time NoSQL database
- **Firebase Auth** - User authentication and management
- **Anthropic Claude API** - AI-powered business analytics

### External Services
- **Cloudinary** - Image hosting and transformation
- **Vercel** - Serverless deployment and hosting

### Development Tools
- **ESLint** - Code quality enforcement
- **TypeScript Compiler** - Zero-tolerance type checking
- **npm** - Dependency management

---

## 🗂️ Project Structure

```
automarket/
├── src/
│   ├── pages/                  # Route-level components
│   │   ├── Home.tsx           # Landing page with featured vehicles
│   │   ├── Cars.tsx           # Vehicle catalog with filters
│   │   ├── CarDetail.tsx      # Individual vehicle details
│   │   ├── Financing.tsx      # Financing application
│   │   ├── Contact.tsx        # Contact/offer form
│   │   └── admin/             # Protected admin pages
│   │       ├── AdminLogin.tsx
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminCars.tsx
│   │       ├── AdminNewSale.tsx (multi-step sale creation)
│   │       ├── AdminSaleDetail.tsx
│   │       ├── AdminFinancing.tsx
│   │       ├── AdminMessages.tsx
│   │       └── AdminAI.tsx    # AI analytics assistant
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Foundational components (Button, Card, Input, Badge)
│   │   ├── admin/            # Admin-specific components
│   │   ├── shared/           # Shared form components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CarCard.tsx       # Vehicle listing card
│   │   └── FilterBar.tsx     # Search and filter controls
│   ├── hooks/                # Custom React hooks
│   │   ├── useCars.ts        # Firestore car queries
│   │   └── useToast.ts       # Toast notifications
│   ├── context/              # React Context
│   │   └── AuthContext.tsx   # Authentication state
│   ├── lib/                  # Utilities and services
│   │   ├── firebase.ts       # Firebase initialization
│   │   ├── authService.ts    # Auth operations
│   │   ├── carsService.ts    # Car database operations
│   │   ├── salesService.ts   # Sales management (types, validation)
│   │   ├── financingService.ts
│   │   ├── messagesService.ts
│   │   ├── cloudinaryService.ts
│   │   ├── invoiceService.ts # PDF generation
│   │   ├── carApiService.ts  # External API integration
│   │   ├── sanitize.ts       # Data sanitization
│   │   ├── formatting.ts     # Shared formatting utilities
│   │   └── validation.ts     # Form validation utilities
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts
│   ├── data/                 # Static data
│   │   └── cars.ts          # Sample car catalog
│   ├── App.tsx               # Main router
│   └── main.tsx              # Entry point
├── server.js                 # Express backend
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
└── .env.example              # Environment template
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** - Included with Node.js
- **Firebase project** - [Create one](https://console.firebase.google.com)
- **Cloudinary account** - [Free tier available](https://cloudinary.com/users/register_free)
- **Anthropic API key** - [Get one](https://console.anthropic.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/automarket.git
   cd automarket
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see Environment Variables section below)

5. **Start development server**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

---

## 🔧 Environment Variables

### Frontend Variables (Required)

**AI Service:**
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```
- Anthropic API key for frontend AI features
- Get from: https://console.anthropic.com/

**API Configuration:**
```
VITE_API_BASE_URL=
```
- Leave empty for development (uses Vite proxy)
- Set to your backend URL for production

### Backend Variables (Required)

**Firebase Admin SDK** (for AI endpoint authentication):
```
FIREBASE_ADMIN_SDK_DISABLED=true        # For development
```
Or for production:
```
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account-json>
```
or
```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

**AI Service:**
```
ANTHROPIC_API_KEY=sk-ant-...
```
- Anthropic API key for the backend
- Get from: https://console.anthropic.com/

**External APIs:**
```
CARAPI_API_KEY=your_api_ninjas_key_here
```
- API Ninjas key for vehicle data enrichment
- Get from: https://api-ninjas.com/
- Required for the `/api/cardata` endpoint

**Deployment:**
```
FRONTEND_URL=https://yourdomain.com
```
- Frontend URL for CORS validation
- Defaults to `https://automarket-ten.vercel.app`
- Update this for your production deployment

---

## 🔐 Firebase Configuration

### Setup Firestore Collections

The application uses these Firestore collections:

1. **`cars`** - Vehicle inventory
2. **`sales`** - Completed transactions
3. **`financing`** - Finance applications
4. **`messages`** - Customer inquiries

### Initialize Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database (start in test mode for development)
3. Enable Firebase Authentication (Email/Password)
4. Get your Firebase config:
   - In Firebase Console: Project Settings → General
   - Copy the config object values

5. Update `src/lib/firebase.ts` with your config:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

### Create Admin User

1. In Firebase Console: Authentication → Users
2. Add a new user with email and password
3. Use these credentials to log into the admin panel at `/admin/login`

---

## 🖼️ Cloudinary Configuration

Cloudinary hosts vehicle images and uploaded documents.

1. Create a free account at https://cloudinary.com/users/register_free
2. In Dashboard, note your:
   - Cloud Name
   - API Key

3. Create an upload preset:
   - Settings → Upload → Add upload preset
   - Set to "Unsigned" for easier uploads
   - Name it something like `automarket_uploads`

4. The application uses Cloudinary's JavaScript SDK for client-side uploads

---

## 🛠️ Development Commands

```bash
# Start Vite dev server + Express backend (recommended)
npm run dev

# Start only frontend dev server
npm run dev:client

# Start only backend server
npm run dev:server

# Production build (TypeScript + Vite)
npm run build

# Preview production build
npm run preview

# Lint code quality
npm run lint

# Run automated tests
npm run test
```

---

## 🔐 Security Architecture

### Authentication
- **Frontend:** Firebase Authentication with email/password
- **Backend:** API key validation on every protected endpoint
- **Rate Limiting:** 20 requests per minute per API key
- **CORS:** Restricted to trusted origins only

### Data Protection
- **Environment Variables:** All secrets in `.env` (never committed)
- **No PII Logging:** Customer names, emails, phones never logged
- **AI Privacy:** Customer data excluded from Claude API requests
- **Storage:** Sensitive data only persisted server-side

### Input Validation
- **Message Length:** 1–5000 characters
- **Conversation Limit:** Maximum 50 messages per request
- **Type Checking:** Full TypeScript compile-time validation

---

## 📊 Building for Production

### Environment Setup
1. Update `FRONTEND_URL` to your deployed domain
2. Update Firebase security rules (restrict Firestore access)
3. Generate strong `AI_ASSISTANT_API_KEY`
4. Ensure all required API keys are configured

### Deployment (Vercel)

1. **Frontend:** Automatically deployed from GitHub
2. **Backend:** Deploy `server.js` separately or use serverless functions
3. **Environment:** Set all variables in Vercel deployment settings

### Build Output
```
dist/                    # Production frontend bundle
dist/assets/            # Optimized CSS and JS
dist/index.html         # Entry HTML
```

---

## 🧪 Testing

### Manual QA Checklist

**Public Experience:**
- [ ] Home page loads with featured vehicles
- [ ] Vehicle catalog displays with working filters
- [ ] Vehicle detail page shows correct info
- [ ] Financing form calculates loan amounts correctly
- [ ] Contact form submits successfully
- [ ] Responsive design works on mobile/tablet/desktop

**Admin Experience:**
- [ ] Login/logout works
- [ ] Protected routes redirect to login
- [ ] Can create vehicle with images
- [ ] Can edit and delete vehicles
- [ ] Sales workflow completes end-to-end
- [ ] PDF invoice generates correctly
- [ ] AI assistant responds to queries
- [ ] Rate limiting blocks excessive requests

---

## ⚠️ Known Limitations

1. **Firestore Cost:** Test mode allows unlimited reads/writes; configure billing limits in production
2. **Image Storage:** Cloudinary free tier has usage limits
3. **AI Costs:** Anthropic API charges per token; monitor usage
4. **Bundle Size:** Main chunk is ~550KB gzipped; route-level code splitting recommended for scaling

---

## 🎯 Performance Notes

### Current Metrics
- **Build Size:** ~546 KB gzipped
- **Largest Chunk:** PDF generation and analytics bundles
- **API Response:** ~200-500ms depending on AI model load

### Future Optimizations
- Lazy-load PDF generation library
- Route-level code splitting for admin features
- Image lazy-loading for vehicle gallery
- Caching strategy for Firestore queries

---

## 📝 Architecture Decisions

### Why Firebase?
- Real-time database for live inventory
- Built-in authentication
- Serverless scaling
- Free tier suitable for portfolio

### Why Anthropic Claude?
- State-of-the-art AI for business analysis
- Safety features reduce harmful outputs
- Clean API for integration

### Why React + TypeScript?
- Type safety catches bugs at compile time
- React ecosystem mature and well-documented
- Demonstrates professional engineering practices

---

## 🤝 Contributing

This is a portfolio project. For improvements or bug reports:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description

---

## 📞 Support & Questions

- **Issues:** Open a GitHub issue for bugs or feature requests
- **Documentation:** See [CLAUDE.md](CLAUDE.md) for project context
- **Email:** [Your contact email]

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Anthropic** - Claude API for business intelligence
- **Firebase** - Real-time database and authentication
- **Cloudinary** - Image hosting and transformation
- **Vercel** - Deployment and hosting

---

**Last Updated:** July 2026  
**Current Version:** 1.0.0  
**Status:** Production Ready
