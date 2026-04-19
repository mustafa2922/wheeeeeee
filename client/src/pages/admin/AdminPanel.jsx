import { Navigate } from 'react-router-dom'

// AdminPanel is now a thin redirect - SuperPanel handles both admin and super_admin roles
export default function AdminPanel() {
  return <Navigate to="/admin" replace />
}