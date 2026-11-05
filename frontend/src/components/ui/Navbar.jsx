import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { User, LogOut, LayoutDashboard, Menu, X, MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const Logo = ({ onClick }) => (
  <Link to="/" onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
    <div style={{ width:38, height:38, background:'var(--brand)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(107,63,160,.18)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="8"  cy="8"  r="3" fill="white" opacity=".9"/>
        <circle cx="16" cy="8"  r="3" fill="white" opacity=".7"/>
        <circle cx="12" cy="14" r="3" fill="white" opacity=".8"/>
        <circle cx="8"  cy="20" r="2" fill="white" opacity=".5"/>
        <circle cx="16" cy="20" r="2" fill="white" opacity=".5"/>
        <line x1="8" y1="8" x2="16" y2="8"  stroke="white" strokeWidth="1.2" opacity=".4"/>
        <line x1="8" y1="8" x2="12" y2="14" stroke="white" strokeWidth="1.2" opacity=".4"/>
        <line x1="16" y1="8" x2="12" y2="14" stroke="white" strokeWidth="1.2" opacity=".4"/>
      </svg>
    </div>
    <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'var(--text)', letterSpacing:'-0.6px' }}>
      Vid<span style={{ color:'var(--brand)' }}>Eita</span>
    </span>
  </Link>
)

const navLinks = [
  { to:'/mapa', label:'Mapa', icon:<MapPin size={15}/> },
  { to:'/#como-funciona', label:'Como funciona' },
  { to:'/#sobre', label:'Sobre' },
]

export default function Navbar() {
  const { user, logout }    = useAuth()
  const location            = useLocation()
  const navigate            = useNavigate()
  const [mopen, setMopen]   = useState(false)

  const closeMenu = () => setMopen(false)

  useEffect(() => {
    closeMenu()
  }, [location.pathname, location.hash])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMopen(false)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!mopen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mopen])

  const handleLogout = () => {
    logout()
    toast.success('Até logo!')
    closeMenu()
    navigate('/')
  }
  const isHome = location.pathname === '/'

  const linkStyle = (to) => ({
    padding:'7px 12px', borderRadius:8, fontSize:14, fontWeight:500,
    color: location.pathname === to ? 'var(--brand)' : 'var(--text2)',
    background: location.pathname === to ? 'var(--brand-dim)' : 'none',
    transition:'all .15s', display:'flex', alignItems:'center', gap:6,
  })

  return (
    <nav className="app-navbar" style={{
      position: isHome ? 'fixed' : 'sticky',
      top:0, left:0, right:0, zIndex:4000,
      background: isHome ? 'rgba(255,255,255,0.96)' : 'var(--bg2)',
      borderBottom:'1px solid var(--border)',
      backdropFilter:'blur(12px)',
      minHeight:72,
      display:'flex', alignItems:'center', padding:'0 28px', gap:8,
    }}>
      <Logo onClick={closeMenu} />

      <div className="navbar-desktop-links" style={{ display:'flex', alignItems:'center', gap:2, marginLeft:24, flex:1 }}>
        {navLinks.map(({ to, label, icon }) => (
          <Link key={to} to={to} style={linkStyle(to)}>
            {icon}{label}
          </Link>
        ))}
      </div>

      <div className="navbar-actions" style={{ display:'flex', alignItems:'center', gap:8 }}>
        {user ? (
          <>
            <Link to="/minhas-ocorrencias" style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:500,
              color:'var(--brand)', border:'1px solid var(--brand-border)',
              background:'var(--brand-dim)', transition:'all .15s', whiteSpace:'nowrap',
            }}>
              <LayoutDashboard size={14} /> Minhas Ocorrências
            </Link>
            <Link to="/nova-ocorrencia" style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'7px 14px', borderRadius:8, fontSize:13, fontWeight:600,
              color:'white', background:'var(--brand)', transition:'all .15s', whiteSpace:'nowrap',
            }}>
              <Plus size={14} /> Nova
            </Link>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <User size={13} color="white" />
              </div>
              <span style={{ fontSize:13, color:'var(--text2)', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.nome?.split(' ')[0]}</span>
            </div>
            <button onClick={handleLogout} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text3)', borderRadius:8, padding:'7px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:13, transition:'all .15s' }}>
              <LogOut size={13} /> Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/entrar" style={{ padding:'7px 16px', borderRadius:8, fontSize:14, fontWeight:500, color:'var(--brand)', border:'1px solid var(--brand-border)', transition:'all .15s' }}>
              Entrar
            </Link>
            <Link to="/nova-ocorrencia" style={{ padding:'7px 18px', borderRadius:8, fontSize:14, fontWeight:600, color:'white', background:'var(--brand)', transition:'all .15s' }}>
              Fazer ocorrência
            </Link>
          </>
        )}
      </div>

      <button
        className="navbar-menu-button"
        onClick={() => setMopen(v => !v)}
        aria-label={mopen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mopen}
        style={{
          display:'none', marginLeft:'auto', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:14,
          width:56, height:56, alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'var(--shadow-sm)'
        }}
      >
        {mopen ? <X size={25}/> : <Menu size={25}/>} 
      </button>

      {mopen && (
        <>
          <button
            type="button"
            className="navbar-mobile-backdrop"
            aria-label="Fechar menu"
            onClick={closeMenu}
          />

          <div className="navbar-mobile-menu fade-up" role="menu">
            {navLinks.map(({ to, label, icon }) => (
              <Link key={to} to={to} onClick={closeMenu} style={{ ...linkStyle(to), padding:'14px 16px', fontSize:15 }}>
                {icon}{label}
              </Link>
            ))}
            <div style={{ height:1, background:'var(--border)', margin:'6px 0' }} />
            {user ? (
              <>
                <Link to="/minhas-ocorrencias" onClick={closeMenu} style={{ ...linkStyle('/minhas-ocorrencias'), padding:'14px 16px', fontSize:15, color:'var(--brand)', background:'var(--brand-dim)' }}>
                  <LayoutDashboard size={16}/> Minhas Ocorrências
                </Link>
                <Link to="/nova-ocorrencia" onClick={closeMenu} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 16px', borderRadius:12, color:'white', background:'var(--brand)', fontWeight:800, fontSize:15 }}>
                  <Plus size={16}/> Nova Ocorrência
                </Link>
                <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 16px', borderRadius:12, background:'transparent', border:'1px solid var(--border)', color:'var(--danger)', fontWeight:800, fontSize:15 }}>
                  <LogOut size={16}/> Sair
                </button>
              </>
            ) : (
              <>
                <Link to="/entrar" onClick={closeMenu} style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 16px', borderRadius:12, border:'1px solid var(--brand-border)', color:'var(--brand)', fontWeight:800, fontSize:15 }}>
                  Entrar
                </Link>
                <Link to="/nova-ocorrencia" onClick={closeMenu} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 16px', borderRadius:12, color:'white', background:'var(--brand)', fontWeight:800, fontSize:15 }}>
                  Fazer Ocorrência
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  )
}
