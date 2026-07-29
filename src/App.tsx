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

// Defines public routes and wraps them in Framer Motion page-transition animations (fade + y-axis slide)
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/auto/:id" element={<CarDetail />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

// Defines admin routes. AdminLayout (sidebar/shell) is mounted ONCE as the parent route element
// and renders an <Outlet/> for the nested page routes below it, so the sidebar stays mounted and
// visually stable while navigating between admin pages - only the routed page content changes.
// Deliberately not wrapped in the pathname-keyed AnimatePresence used for public routes: keying a
// wrapping element by location.pathname forces React to unmount/remount everything inside it
// (including nested route parents like AdminLayout) on every navigation, regardless of route
// nesting - that was the actual cause of the sidebar "jumping"/re-rendering on every admin route
// change, not a real document reload.
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="cars" element={<AdminCars />} />
        <Route path="cars/add" element={<AdminAddCar />} />
        <Route path="cars/edit/:id" element={<AdminEditCar />} />
        <Route path="financing" element={<AdminFinancing />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="ai" element={<AdminAI />} />
        <Route path="sales" element={<AdminSales />} />
        <Route path="sales/new" element={<AdminNewSale />} />
        <Route path="sales/edit/:id" element={<AdminEditSale />} />
        <Route path="sales/:id" element={<AdminSaleDetail />} />
      </Route>
    </Routes>
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

// Decides layout based on the current route - admin paths render the persistent AdminLayout shell, public paths get Navbar and Footer
function RouteChecker() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <AdminRoutes />
  }

  return (
    <>
      <Navbar />
      <div className="flex-1">
        <AnimatedRoutes />
      </div>
      <Footer />
    </>
  )
}
