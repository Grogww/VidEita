import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import HomePage     from './pages/HomePage'
import LoginPage    from './pages/LoginPage'
import MapPage      from './pages/MapPage'
import NewReportPage from './pages/NewReportPage'
import DashboardPage from './pages/DashboardPage'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loader />
  return user ? children : <Navigate to="/entrar" replace />
}

function Loader() {
  return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--brand)', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ color:'var(--text3)', fontSize:13 }}>Carregando...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/"              element={<HomePage />} />
      <Route path="/entrar"        element={user ? <Navigate to="/mapa" replace /> : <LoginPage />} />
      <Route path="/login"         element={<Navigate to="/entrar" replace />} />
      <Route path="/mapa"          element={<Guard><MapPage /></Guard>} />

      {/* Rotas oficiais */}
      <Route path="/nova-ocorrencia" element={<Guard><NewReportPage /></Guard>} />
      <Route path="/minhas-ocorrencias" element={<Guard><DashboardPage /></Guard>} />

      {/* Compatibilidade com nomes antigos dos botões */}
      <Route path="/nova-denuncia" element={<Navigate to="/nova-ocorrencia" replace />} />
      <Route path="/nova-Ocorrencia" element={<Navigate to="/nova-ocorrencia" replace />} />
      <Route path="/nova-Ocorrência" element={<Navigate to="/nova-ocorrencia" replace />} />
      <Route path="/minhas-Ocorrencia" element={<Navigate to="/minhas-ocorrencias" replace />} />
      <Route path="/minhas-Ocorrência" element={<Navigate to="/minhas-ocorrencias" replace />} />

      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        style: { background:'var(--bg2)', color:'var(--text)', border:'1px solid var(--border)', fontFamily:'var(--font-body)', fontSize:14, borderRadius:10 },
        success: { iconTheme:{ primary:'var(--brand)', secondary:'#fff' } },
        error:   { iconTheme:{ primary:'var(--danger)', secondary:'#fff' } },
      }} />
      <AppRoutes />
    </AuthProvider>
  )
}