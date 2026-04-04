import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import ChatbotWidget from './components/shared/ChatbotWidget'

// Lazy pages
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const AuthPage = React.lazy(() => import('./pages/auth/AuthPage').then(m => ({ default: m.AuthPage })))

// Donor
const DonorDashboard = React.lazy(() => import('./pages/donor/DonorDashboard').then(m => ({ default: m.DonorDashboard })))
const DonationForm = React.lazy(() => import('./pages/donor/DonationForm').then(m => ({ default: m.DonationForm })))
const DonationHistory = React.lazy(() => import('./pages/donor/DonationHistory').then(m => ({ default: m.DonationHistory })))
const DonorTrackingPage = React.lazy(() => import('./pages/donor/DonorTrackingPage').then(m => ({ default: m.DonorTrackingPage })))

// NGO
const NgoDashboard = React.lazy(() => import('./pages/ngo/NgoDashboard').then(m => ({ default: m.NgoDashboard })))
const NgoAvailableDonations = React.lazy(() => import('./pages/ngo/NgoAvailableDonations').then(m => ({ default: m.NgoAvailableDonations })))
const NgoAcceptedPage = React.lazy(() => import('./pages/ngo/NgoAcceptedPage').then(m => ({ default: m.NgoAcceptedPage })))
const NgoTrackingPage = React.lazy(() => import('./pages/ngo/NgoTrackingPage').then(m => ({ default: m.NgoTrackingPage })))
const FoodRequestForm = React.lazy(() => import('./pages/ngo/FoodRequestForm').then(m => ({ default: m.FoodRequestForm })))

// Admin
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AgentLogPage = React.lazy(() => import('./pages/admin/AgentLogPage').then(m => ({ default: m.AgentLogPage })))
const AllDonationsPage = React.lazy(() => import('./pages/admin/AllDonationsPage').then(m => ({ default: m.AllDonationsPage })))
const AdminDonorsPage = React.lazy(() => import('./pages/admin/AdminDonorsPage').then(m => ({ default: m.AdminDonorsPage })))
const AdminNgosPage = React.lazy(() => import('./pages/admin/AdminNgosPage').then(m => ({ default: m.AdminNgosPage })))
const AdminFoodRequestsPage = React.lazy(() => import('./pages/admin/AdminFoodRequestsPage').then(m => ({ default: m.AdminFoodRequestsPage })))
const AdminAlertsPage = React.lazy(() => import('./pages/admin/AdminAlertsPage').then(m => ({ default: m.AdminAlertsPage })))

// Shared
const SettingsPage = React.lazy(() => import('./pages/shared/SettingsPage').then(m => ({ default: m.SettingsPage })))

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--background)' }}>
    <div style={{ width: 48, height: 48, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(13,99,27,0.2)' }}>
      <span className="material-symbols-outlined icon-filled" style={{ color: 'white', fontSize: 28 }}>volunteer_activism</span>
    </div>
    <div style={{ display: 'flex', gap: '4px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
      ))}
    </div>
  </div>
)

function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'ngo') return <Navigate to="/ngo" replace />
  return <Navigate to="/donor" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<RoleRedirect />} />

          {/* Donor */}
          <Route path="/donor" element={<ProtectedRoute requiredRole="donor"><DonorDashboard /></ProtectedRoute>} />
          <Route path="/donor/donate" element={<ProtectedRoute requiredRole="donor"><DonationForm /></ProtectedRoute>} />
          <Route path="/donor/history" element={<ProtectedRoute requiredRole="donor"><DonationHistory /></ProtectedRoute>} />
          <Route path="/donor/tracking" element={<ProtectedRoute requiredRole="donor"><DonorTrackingPage /></ProtectedRoute>} />
          <Route path="/donor/settings" element={<ProtectedRoute requiredRole="donor"><SettingsPage /></ProtectedRoute>} />

          {/* NGO */}
          <Route path="/ngo" element={<ProtectedRoute requiredRole="ngo"><NgoDashboard /></ProtectedRoute>} />
          <Route path="/ngo/donations" element={<ProtectedRoute requiredRole="ngo"><NgoAvailableDonations /></ProtectedRoute>} />
          <Route path="/ngo/requests" element={<ProtectedRoute requiredRole="ngo"><FoodRequestForm /></ProtectedRoute>} />
          <Route path="/ngo/accepted" element={<ProtectedRoute requiredRole="ngo"><NgoAcceptedPage /></ProtectedRoute>} />
          <Route path="/ngo/tracking" element={<ProtectedRoute requiredRole="ngo"><NgoTrackingPage /></ProtectedRoute>} />
          <Route path="/ngo/settings" element={<ProtectedRoute requiredRole="ngo"><SettingsPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/donations" element={<ProtectedRoute requiredRole="admin"><AllDonationsPage /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute requiredRole="admin"><AgentLogPage /></ProtectedRoute>} />
          <Route path="/admin/donors" element={<ProtectedRoute requiredRole="admin"><AdminDonorsPage /></ProtectedRoute>} />
          <Route path="/admin/ngos" element={<ProtectedRoute requiredRole="admin"><AdminNgosPage /></ProtectedRoute>} />
          <Route path="/admin/requests" element={<ProtectedRoute requiredRole="admin"><AdminFoodRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/alerts" element={<ProtectedRoute requiredRole="admin"><AdminAlertsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ChatbotWidget />
    </BrowserRouter>
  )
}
