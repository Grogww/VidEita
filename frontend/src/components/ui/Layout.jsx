import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MapPin, Plus, LogOut, LogIn, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Até logo!')
    navigate('/entrar')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header style={{
        height: 56,
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
        zIndex: 1000,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{
            width: 30, height: 30, background: 'var(--brand)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={16} color="#0E1117" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
            Urban<span style={{ color: 'var(--brand)' }}>Report</span>
          </span>
        </Link>

        {/* Nav links */}
        <NavLink to="/" active={location.pathname === '/'}>
          <MapPin size={15} /> Mapa
        </NavLink>

        {user && (
          <NavLink to="/nova-ocorrencia" active={location.pathname === '/nova-ocorrencia'}>
            <Plus size={15} /> Nova Denúncia
          </NavLink>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User area */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--surface)', borderRadius: 99,
              padding: '5px 12px 5px 8px', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--brand-dim)', border: '1px solid var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={12} color="var(--brand)" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.nome}
              </span>
              {user.role === 'admin' && (
                <span style={{
                  fontSize: 10, fontWeight: 600, background: 'var(--brand-dim)',
                  color: 'var(--brand)', padding: '1px 6px', borderRadius: 99,
                  border: '1px solid rgba(0,200,150,0.25)',
                }}>ADMIN</span>
              )}
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text3)', borderRadius: 8,
              padding: '5px 10px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: 5, fontSize: 13,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <LogOut size={13} /> Sair
            </button>
          </div>
        ) : (
          <Link to="/entrar" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--brand)', color: '#0E1117',
            fontWeight: 600, fontSize: 13, padding: '6px 14px',
            borderRadius: 8, transition: 'opacity 0.15s',
          }}>
            <LogIn size={14} /> Entrar
          </Link>
        )}
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
    </div>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 13, fontWeight: 500, padding: '5px 10px',
      borderRadius: 8, transition: 'all 0.15s',
      color: active ? 'var(--brand)' : 'var(--text2)',
      background: active ? 'var(--brand-dim)' : 'none',
    }}>
      {children}
    </Link>
  )
}
