import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/ui/Navbar'

export default function LoginPage() {
  const [mode, setMode]       = useState('login')
  const [nome, setNome]       = useState('')
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, googleLogin, register }   = useAuth()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const navigate              = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, senha)
        toast.success('Bem-vindo de volta!')
      } else {
        if (nome.trim().length < 2) { toast.error('Nome muito curto'); return }
        await register(nome, email, senha)
        toast.success('Conta criada com sucesso!')
      }
      navigate('/mapa')
    } catch (err) {
      toast.error(err.response?.data?.mensagem || 'Erro ao autenticar')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />
      <div className="login-shell" style={{ minHeight:'calc(100vh - 60px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        {/* Left decoration */}
        <div className="login-decoration" style={{ position:'fixed', left:0, top:0, bottom:0, width:'40%', background:'linear-gradient(135deg, var(--brand-dim), rgba(168,85,247,.05))', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, pointerEvents:'none' }}>
          <div style={{ opacity:.15 }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              {[...Array(7)].map((_,i)=>(
                <circle key={i} cx={100+Math.cos(i*51.4*Math.PI/180)*65} cy={100+Math.sin(i*51.4*Math.PI/180)*65} r="28" fill="var(--brand)"/>
              ))}
              <circle cx="100" cy="100" r="30" fill="var(--brand)"/>
            </svg>
          </div>
          <p style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--brand)', textAlign:'center', marginTop:24, opacity:.4 }}>
            Vide<span style={{ color:'var(--brand-dark)' }}>Eita</span>
          </p>
        </div>

        {/* Form card */}
        <div className="fade-up login-card" style={{ width:'100%', maxWidth:420, marginLeft:'40%', paddingLeft:60 }}>
          <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text3)', marginBottom:28 }}>
            <ArrowLeft size={14}/> Voltar
          </Link>

          <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </h1>
          <p style={{ color:'var(--text3)', fontSize:14, marginBottom:28 }}>
            {mode === 'login' ? 'Entre para acompanhar suas Ocorrência.' : 'Junte-se ao VideEita e ajude Videira.'}
          </p>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:'var(--bg3)', borderRadius:10, padding:3, marginBottom:28, border:'1px solid var(--border)' }}>
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:'8px 0', fontSize:13, fontWeight:600, borderRadius:8, border:'none', cursor:'pointer', transition:'all .2s', background:mode===m?'var(--bg2)':'none', color:mode===m?'var(--brand)':'var(--text3)', fontFamily:'var(--font-body)', boxShadow:mode===m?'var(--shadow-sm)':'none' }}>
                {m==='login'?'Entrar':'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode==='register'&&(
              <Field label="Nome completo">
                <input type="text" placeholder="João da Silva" value={nome} onChange={e=>setNome(e.target.value)} required style={inp}/>
              </Field>
            )}
            <Field label="E-mail">
              <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required style={inp}/>
            </Field>
            <Field label="Senha" last>
              <div style={{ position:'relative' }}>
                <input type={show?'text':'password'} placeholder="Mínimo 6 caracteres" value={senha} onChange={e=>setSenha(e.target.value)} required minLength={6} style={{ ...inp, paddingRight:42 }}/>
                <button type="button" onClick={()=>setShow(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text3)', display:'flex' }}>
                  {show?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            </Field>


            {googleClientId && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:12, margin:'22px 0 18px' }}>
                  <div style={{ height:1, background:'var(--border)', flex:1 }} />
                  <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>OU</span>
                  <div style={{ height:1, background:'var(--border)', flex:1 }} />
                </div>
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <GoogleLogin
                    onSuccess={async (response) => {
                      try {
                        setLoading(true)
                        await googleLogin(response.credential)
                        toast.success('Login com Google realizado!')
                        navigate('/mapa')
                      } catch (err) {
                        toast.error(err.response?.data?.mensagem || 'Erro no login com Google')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    onError={() => toast.error('Não foi possível entrar com Google')}
                    theme="outline"
                    size="large"
                    text={mode === 'login' ? 'signin_with' : 'signup_with'}
                    shape="pill"
                    width="320"
                  />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} style={{ width:'100%', marginTop:24, padding:'13px 0', background:loading?'var(--surface)':'var(--brand)', color:loading?'var(--text3)':'white', border:'none', borderRadius:10, fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s', boxShadow:loading?'none':'0 4px 16px rgba(107,63,160,.3)' }}>
              {loading&&<Loader size={16} style={{ animation:'spin .8s linear infinite' }}/>}
              {loading?'Aguarde...':mode==='login'?'Entrar':'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, last }) {
  return (
    <div style={{ marginBottom:last?0:16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:6, letterSpacing:'.4px' }}>{label.toUpperCase()}</label>
      {children}
    </div>
  )
}
const inp = { width:'100%', padding:'11px 13px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--text)', fontSize:14, outline:'none', fontFamily:'var(--font-body)' }
