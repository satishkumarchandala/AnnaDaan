import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'donor' | 'ngo' | 'admin'
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/auth" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to the user's correct dashboard
    if (user.role === 'donor') return <Navigate to="/donor" replace />
    if (user.role === 'ngo') return <Navigate to="/ngo" replace />
    if (user.role === 'admin') return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
