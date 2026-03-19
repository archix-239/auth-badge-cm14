import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Login          from './pages/Login'
import OTPRecovery    from './pages/OTPRecovery'
import AgentLayout    from './components/layout/AgentLayout'
import AdminLayout    from './components/layout/AdminLayout'
import AgentDashboard from './pages/agent/AgentDashboard'
import Scanner        from './pages/agent/Scanner'
import AgentHistory   from './pages/agent/AgentHistory'
import AgentProfile   from './pages/agent/AgentProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import BadgeInscription from './pages/admin/BadgeInscription'
import PassageHistory from './pages/admin/PassageHistory'
import SupervisionConsole from './pages/admin/SupervisionConsole'
import UserManagement from './pages/admin/UserManagement'
import ZoneManagement from './pages/admin/ZoneManagement'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        <p className="text-sm font-medium">Chargement du terminal CM14...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return user.role === 'agent'
      ? <Navigate to="/agent/dashboard" replace />
      : <Navigate to="/admin/dashboard" replace />
  }
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login"        element={<Login />} />
      <Route path="/otp-recovery" element={<OTPRecovery />} />

      {/* Agent routes — mobile first */}
      <Route path="/agent" element={
        <ProtectedRoute allowedRoles={['agent']}>
          <AgentLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route path="scanner"   element={<Scanner />} />
        <Route path="history"   element={<AgentHistory />} />
        <Route path="profile"   element={<AgentProfile />} />
      </Route>

      {/* Admin routes — desktop sidebar */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"   element={<AdminDashboard />} />
        <Route path="inscription" element={<BadgeInscription />} />
        <Route path="passages"    element={<PassageHistory />} />
        <Route path="supervision"  element={<SupervisionConsole />} />
        <Route path="zones"        element={<ZoneManagement />} />
        <Route path="utilisateurs" element={<UserManagement />} />
      </Route>

      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'agent' ? '/agent/dashboard' : '/admin/dashboard'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
