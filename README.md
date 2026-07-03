# AutoMarket 🚗
> Professional car dealership management platform built with React, Firebase, and AI integration.

**Live Demo:** https://automarket-ten.vercel.app

## Screenshots
[Add 2-3 screenshots: Home page, Inventory, Admin Dashboard]

## Features
- Public car catalog with filters (brand, price, year)
- Favorites system with localStorage + Firebase sync
- Admin panel: Sales, Financing, Messages, Inventory CRUD
- AI Assistant powered by Anthropic Claude API
- Invoice PDF generation
- Financing calculator
- Responsive design (mobile, tablet, desktop)

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Firebase Firestore + Firebase Auth
- **Storage:** Cloudinary
- **AI:** Anthropic Claude API
- **Animations:** Framer Motion
- **Deployment:** Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project
- Cloudinary account
- Anthropic API key

### Installation
```bash
npm install
```

### Environment Variables
Create a .env file based on .env.example:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_API_KEY=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_ANTHROPIC_API_KEY=
VITE_AI_ASSISTANT_API_KEY=
```

### Run locally
```bash
npm run dev
```

## Admin Panel
The admin panel is at /admin/login
Contact me for demo credentials or set up your own Firebase project using the instructions above.

## License
MIT
