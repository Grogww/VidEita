import { Link } from 'react-router-dom'
import Navbar from '../components/ui/Navbar'
import { ArrowRight, ChevronDown, FileText, Send, Search, Bell, Shield, Eye, Users, MapPin } from 'lucide-react'

const GrapeIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <circle cx="17" cy="16" r="5" fill="var(--brand)" opacity=".9"/>
    <circle cx="31" cy="16" r="5" fill="var(--brand)" opacity=".7"/>
    <circle cx="24" cy="26" r="5" fill="var(--brand)" opacity=".85"/>
    <circle cx="17" cy="36" r="4" fill="var(--brand)" opacity=".6"/>
    <circle cx="31" cy="36" r="4" fill="var(--brand)" opacity=".6"/>
    <circle cx="24" cy="44" r="3" fill="var(--brand)" opacity=".4"/>
    <line x1="24" y1="4" x2="24" y2="11" stroke="var(--brand-dark)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 8 Q30 4 34 8" stroke="var(--brand-dark)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
)

const stats = [
  { num: '+12 mil', label: 'Ocorrência recebidas' },
  { num: '95%', label: 'Taxa de encaminhamento' },
  { num: '+30', label: 'Órgãos parceiros' },
  { num: '+200 mil', label: 'Cidadãos impactados' },
]

const features = [
  { icon: <FileText size={28}/>, title: 'É simples', desc: 'Faça sua Ocorrência em poucos minutos.' },
  { icon: <Shield size={28}/>, title: 'É seguro', desc: 'Seus dados são protegidos e sua identidade preservada.' },
  { icon: <Eye size={28}/>, title: 'É sigiloso', desc: 'Acompanhamento discreto e com total confidencialidade.' },
  { icon: <Users size={28}/>, title: 'É para todos', desc: 'Um canal aberto para cuidar da nossa cidade juntos.' },
]

const steps = [
  { n:'1', icon: <FileText size={28}/>, title:'Você faz a Ocorrência', desc:'Preencha o formulário com as informações da ocorrência.' },
  { n:'2', icon: <Send size={28}/>, title:'Recebemos e encaminhamos', desc:'Sua Ocorrência é analisada e enviada ao órgão competente.' },
  { n:'3', icon: <Search size={28}/>, title:'Órgão investiga', desc:'O órgão responsável avalia e toma as providências cabíveis.' },
  { n:'4', icon: <Bell size={28}/>, title:'Você acompanha', desc:'Acompanhe o andamento da sua Ocorrência de forma simples e segura.' },
]

export default function HomePage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <section id="inicio" className="home-hero" style={{ minHeight:'100vh', display:'flex', alignItems:'center', position:'relative', overflow:'hidden', paddingTop:60 }}>
        {/* Grape bg decoration */}
        <div className="home-hero-decoration" style={{ position:'absolute', right:-80, top:'50%', transform:'translateY(-50%)', opacity:.06, pointerEvents:'none' }}>
          <svg width="600" height="600" viewBox="0 0 600 600">
            {[...Array(12)].map((_,i) => (
              <circle key={i} cx={300 + Math.cos(i*30*Math.PI/180)*180} cy={300 + Math.sin(i*30*Math.PI/180)*180} r="60" fill="var(--brand)"/>
            ))}
            <circle cx="300" cy="300" r="70" fill="var(--brand)"/>
          </svg>
        </div>

        <div className="home-hero-grid" style={{ maxWidth:1120, margin:'0 auto', padding:'80px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center', width:'100%' }}>
          <div className="fade-up">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--brand-dim)', border:'1px solid var(--brand-border)', borderRadius:99, padding:'5px 14px', fontSize:12, fontWeight:600, color:'var(--brand)', marginBottom:24, letterSpacing:.5 }}>
              <MapPin size={12}/> Videira, Santa Catarina
            </div>

            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(36px,5vw,56px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-1.5px', marginBottom:20 }}>
              Conectando você<br/>
              <span style={{ color:'var(--brand)' }}>a uma cidade melhor.</span>
            </h1>

            <p style={{ fontSize:17, color:'var(--text2)', lineHeight:1.7, marginBottom:36, maxWidth:460 }}>
              O VideEita é o canal direto entre cidadãos e órgãos públicos para Ocorrência de forma simples, segura e responsável.
            </p>

            <div className="home-actions" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <Link to="/nova-ocorrencia" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--brand)', color:'white', padding:'13px 24px', borderRadius:10, fontSize:15, fontWeight:600, transition:'all .2s', boxShadow:'0 4px 16px rgba(107,63,160,.3)' }}>
                Fazer Ocorrência <ArrowRight size={16}/>
              </Link>

              <a href="#como-funciona" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--bg2)', color:'var(--text)', border:'1px solid var(--border)', padding:'13px 24px', borderRadius:10, fontSize:15, fontWeight:500 }}>
                Saiba mais <ChevronDown size={16}/>
              </a>
            </div>
          </div>

          {/* Map preview card */}
          <div className="fade-up home-preview-card" style={{ animationDelay:'.1s', background:'var(--bg2)', borderRadius:20, overflow:'hidden', border:'1px solid var(--border)', boxShadow:'var(--shadow-lg)' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#ff5f56'}}/>
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#ffbd2e'}}/>
              <div style={{ width:10,height:10,borderRadius:'50%',background:'#27c93f'}}/>
              <span style={{ marginLeft:8, fontSize:12, color:'var(--text3)', fontFamily:'var(--font-display)' }}>
                VideEita@videra.sc.gov.br
              </span>
            </div>

            <div style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                {['🕳️ Buraco', '💡 Iluminação', '🗑️ Lixo', '🚧 Sinalização'].map(cat => (
                  <div key={cat} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--text2)', border:'1px solid var(--border)', fontWeight:500 }}>
                    {cat}
                  </div>
                ))}
              </div>

              <div style={{ background:'var(--bg3)', borderRadius:10, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>Ocorrência recentes</span>
                  <span style={{ fontSize:11, color:'var(--brand)', fontWeight:600 }}>Ver mapa →</span>
                </div>

                {[
                  { t:'Buraco na Rua XV de Novembro', s:'Em andamento', c:'#8B5CF6' },
                  { t:'Lâmpada queimada - Centro', s:'Recebida', c:'#F59E0B' },
                  { t:'Descarte irregular de lixo', s:'Concluída', c:'#22C55E' },
                ].map((r,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: i<2 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize:12, color:'var(--text2)', flex:1, marginRight:8 }}>
                      {r.t}
                    </span>
                    <span style={{ fontSize:11, fontWeight:600, color:r.c, background:`${r.c}18`, padding:'2px 8px', borderRadius:99, whiteSpace:'nowrap' }}>
                      {r.s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background:'var(--bg3)', padding:'80px 24px', borderTop:'1px solid var(--border)' }}>
        <div className="home-features-grid" style={{ maxWidth:1120, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          {features.map((f,i) => (
            <div key={i} className="fade-up" style={{ animationDelay:`${i*.07}s`, background:'var(--bg2)', borderRadius:16, padding:28, border:'1px solid var(--border)', textAlign:'center' }}>
              <div style={{ width:60,height:60,borderRadius:16,background:'var(--brand-dim)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',color:'var(--brand)' }}>
                {f.icon}
              </div>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, marginBottom:8 }}>
                {f.title}
              </p>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" style={{ padding:'100px 24px' }}>
        <div style={{ maxWidth:1120, margin:'0 auto' }}>
          <div style={{ marginBottom:60 }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:800, letterSpacing:'-1px', marginBottom:8 }}>
              Como funciona
            </h2>
            <div style={{ width:40, height:3, background:'var(--brand)', borderRadius:99 }}/>
          </div>

          <div className="home-steps-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, position:'relative' }}>
            <div className="home-steps-line" style={{ position:'absolute', top:28, left:'12.5%', right:'12.5%', height:2, background:'linear-gradient(90deg, var(--brand), var(--accent))', zIndex:0, opacity:.3 }}/>
            {steps.map((s,i) => (
              <div key={i} className="fade-up" style={{ animationDelay:`${i*.1}s`, textAlign:'center', padding:'0 16px', position:'relative', zIndex:1 }}>
                <div style={{ width:56,height:56,borderRadius:'50%',background:'var(--brand)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontFamily:'var(--font-display)',fontWeight:800,fontSize:20,boxShadow:'0 4px 16px rgba(107,63,160,.3)' }}>
                  {s.n}
                </div>
                <div style={{ color:'var(--brand)', marginBottom:12 }}>
                  {s.icon}
                </div>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:8 }}>
                  {s.title}
                </p>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grape city banner */}
      <section className="home-banner" style={{ background:'linear-gradient(135deg, var(--brand-dim) 0%, rgba(168,85,247,.08) 100%)', border:'1px solid var(--brand-border)', margin:'0 24px', borderRadius:20, padding:'48px 56px', maxWidth:1072, marginLeft:'auto', marginRight:'auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:32, flexWrap:'wrap' }}>
        <div>
          <p style={{ fontSize:20, lineHeight:1.5, color:'var(--text)', maxWidth:600 }}>
            <strong>Videira,</strong> capital da uva, símbolo de trabalho, união e cuidado com o que é nosso.<br/>
            <strong style={{ color:'var(--brand)' }}>Vamos juntos construir uma cidade ainda melhor.</strong>
          </p>
        </div>
        <GrapeIcon />
      </section>

      {/* Stats */}
      <section style={{ padding:'80px 24px' }}>
        <div className="home-stats-grid" style={{ maxWidth:1120, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
          {stats.map((s,i) => (
            <div key={i} style={{ textAlign:'center', padding:32, background:'var(--bg2)', borderRadius:16, border:'1px solid var(--border)' }}>
              <p style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:800, color:'var(--brand)', letterSpacing:'-1px', marginBottom:6 }}>
                {s.num}
              </p>
              <p style={{ fontSize:13, color:'var(--text2)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'var(--text)', color:'rgba(255,255,255,.7)', padding:'48px 24px 24px' }}>
        <div style={{ maxWidth:1120, margin:'0 auto' }}>
          <div className="home-footer-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:40 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <div style={{ width:32, height:32, background:'var(--brand)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="8" cy="8" r="3" fill="white" opacity=".9"/>
                    <circle cx="16" cy="8" r="3" fill="white" opacity=".7"/>
                    <circle cx="12" cy="14" r="3" fill="white" opacity=".8"/>
                  </svg>
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'white' }}>
                  VideEita
                </span>
              </div>
              <p style={{ fontSize:13, lineHeight:1.7 }}>
                Conectando cidadãos e órgãos públicos por uma cidade melhor.
              </p>
            </div>

            <div>
              <p style={{ fontWeight:600, color:'white', marginBottom:12, fontSize:13 }}>
                Links rápidos
              </p>

              <p style={{ fontSize:13, marginBottom:8 }}>
                <a href="#inicio" style={{ color:'rgba(255,255,255,.6)' }}>
                  Início
                </a>
              </p>

              <p style={{ fontSize:13, marginBottom:8 }}>
                <a href="#como-funciona" style={{ color:'rgba(255,255,255,.6)' }}>
                  Como funciona
                </a>
              </p>

              <p style={{ fontSize:13, marginBottom:8, color:'rgba(255,255,255,.6)' }}>
                Órgãos parceiros
              </p>

              <p style={{ fontSize:13, marginBottom:8, color:'rgba(255,255,255,.6)' }}>
                Dúvidas frequentes
              </p>
            </div>

            <div>
              <p style={{ fontWeight:600, color:'white', marginBottom:12, fontSize:13 }}>
                Órgãos parceiros
              </p>
              <p style={{ fontSize:13, marginBottom:8, color:'rgba(255,255,255,.6)' }}>
                Prefeitura de Videira
              </p>
              <a href="#" style={{ fontSize:12, color:'var(--accent)' }}>
                Ver todos os parceiros →
              </a>
            </div>

            <div>
              <p style={{ fontWeight:600, color:'white', marginBottom:12, fontSize:13 }}>
                Fale conosco
              </p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:4 }}>
                VideEita@videra.sc.gov.br
              </p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>
                (49) 1234-5678
              </p>
            </div>
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,.1)', paddingTop:20, textAlign:'center', fontSize:12 }}>
            © 2026 VideEita. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}