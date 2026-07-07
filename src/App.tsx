import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Cars from './pages/Cars'
import Favourites from './pages/Favourites'
import Financing from './pages/Financing'
import Contact from './pages/Contact'
import CarDetail from './pages/CarDetail'
import SeedButton from './components/SeedButton'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './components/admin/AdminLayout'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminCars from './pages/admin/AdminCars'
import AdminAddCar from './pages/admin/AdminAddCar'
import AdminEditCar from './pages/admin/AdminEditCar'
import AdminFinancing from './pages/admin/AdminFinancing'
import AdminMessages from './pages/admin/AdminMessages'
import AdminAI from './pages/admin/AdminAI'
import AdminSales from './pages/admin/AdminSales'
import AdminNewSale from './pages/admin/AdminNewSale'
import AdminSaleDetail from './pages/admin/AdminSaleDetail'
import AdminEditSale from './pages/admin/AdminEditSale'

// Resets the window scroll position to the top on every route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Defines all app routes (public and admin) and wraps them in Framer Motion page-transition animations - admin routes animate with opacity only, public routes also animate on the y-axis
function AnimatedRoutes() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: isAdminRoute ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isAdminRoute ? 0 : -8 }}
        transition={{ duration: isAdminRoute ? 0 : 0.25 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/auto/:id" element={<CarDetail />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/contact" element={<Contact />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/cars" element={<ProtectedRoute><AdminLayout><AdminCars /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/cars/add" element={<ProtectedRoute><AdminLayout><AdminAddCar /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/cars/edit/:id" element={<ProtectedRoute><AdminLayout><AdminEditCar /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/financing" element={<ProtectedRoute><AdminLayout><AdminFinancing /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute><AdminLayout><AdminMessages /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/ai" element={<ProtectedRoute><AdminLayout><AdminAI /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/sales" element={<ProtectedRoute><AdminLayout><AdminSales /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/sales/new" element={<ProtectedRoute><AdminLayout><AdminNewSale /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/sales/edit/:id" element={<ProtectedRoute><AdminLayout><AdminEditSale /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin/sales/:id" element={<ProtectedRoute><AdminLayout><AdminSaleDetail /></AdminLayout></ProtectedRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

// Root app component - wraps the whole tree in AuthProvider (Firebase auth state) and BrowserRouter, then delegates layout decisions to RouteChecker
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-[#F2F2F0] text-white font-inter">
          <ScrollToTop />
          <RouteChecker />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Decides layout based on the current route - admin paths render routes alone (AdminLayout handles its own chrome), public paths get Navbar, Footer, and the SeedButton
function RouteChecker() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <AnimatedRoutes />
  }

  return (
    <>
      <Navbar />
      <div className="flex-1">
        <AnimatedRoutes />
      </div>
      <Footer />
      <SeedButton />
    </>
  )
}
