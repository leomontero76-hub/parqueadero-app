import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import GuardHome from './pages/GuardHome'
import AdminDashboard from './pages/AdminDashboard'

function AppRouter() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Cargando...
      </div>
    )
  }

  if (!session) return <Login />

  if (!profile) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: 20 }}>
        No se encontró un perfil asociado a esta cuenta. Contacta al administrador del sistema.
      </div>
    )
  }

  if (!profile.active) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center', padding: 20 }}>
        Tu cuenta está desactivada. Contacta al administrador del conjunto.
      </div>
    )
  }

  return profile.role === 'admin' ? <AdminDashboard /> : <GuardHome />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
