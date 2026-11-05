import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, Clock, ChevronRight, Circle, Loader, AlertCircle, LayoutDashboard } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/ui/Navbar'

const STATUS_CFG = {
  pendente:     { label:'Recebida',     color:'#F59E0B', bg:'#FEF3C7' },
  em_analise:   { label:'Em análise',   color:'#3B82F6', bg:'#DBEAFE' },
  em_andamento: { label:'Em andamento', color:'#8B5CF6', bg:'#EDE9FE' },
  resolvido:    { label:'Concluída',    color:'#22C55E', bg:'#DCFCE7' },
  rejeitado:    { label:'Rejeitada',    color:'#EF4444', bg:'#FEE2E2' },
}

const CAT_EMOJI = { buraco:'🕳️', lixo:'🗑️', iluminacao:'💡', calcada:'🚶', sinalizacao:'🚧', esgoto:'💧', outro:'📍' }

const TABS = [
  { k:'todos',      l:'Todos' },
  { k:'em_andamento', l:'Em andamento' },
  { k:'resolvido',  l:'Concluídas' },
  { k:'rejeitado',  l:'Arquivadas' },
]

export default function DashboardPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('todos')
  const { user }              = useAuth()

  useEffect(() => {
    reportsApi.listar()
      .then(r => setReports(r.data.data.reports))
      .catch(() => toast.error('Erro ao carregar Ocorrência'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = tab === 'todos' ? reports : reports.filter(r => r.status === tab)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar/>
      <div className="dashboard-grid" style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px', display:'grid', gridTemplateColumns:'220px 1fr', gap:28, alignItems:'start' }}>

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <Link to="/nova-ocorrencia" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px 0', background:'var(--brand)', color:'white', borderRadius:10, fontSize:14, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:20, boxShadow:'0 4px 16px rgba(107,63,160,.3)', textDecoration:'none', transition:'all .2s' }}>
            <Plus size={16}/> Nova Ocorrência
          </Link>
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            {[
              { icon:<LayoutDashboard size={15}/>, label:'Minhas Ocorrência', to:'/minhas-ocorrencias', active:true },
              { icon:<MapPin size={15}/>, label:'Ver no mapa', to:'/mapa', active:false },
            ].map((item,i)=>(
              <Link key={i} to={item.to} style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', fontSize:13, fontWeight:item.active?600:400, color:item.active?'var(--brand)':'var(--text2)', background:item.active?'var(--brand-dim)':'none', borderLeft:item.active?'3px solid var(--brand)':'3px solid transparent', textDecoration:'none', transition:'all .15s' }}>
                {item.icon} {item.label}
              </Link>
            ))}
            <div style={{ borderTop:'1px solid var(--border)', padding:'12px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg3)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <span style={{ color:'white', fontSize:12, fontWeight:700 }}>{user?.nome?.[0]?.toUpperCase()}</span>
                </div>
                <div style={{ overflow:'hidden' }}>
                  <p style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.nome}</p>
                  <p style={{ fontSize:11, color:'var(--text3)' }}>{user?.role === 'admin' ? '👑 Administrador' : 'Cidadão'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transparency card */}
          <div style={{ marginTop:16, background:'var(--brand-dim)', border:'1px solid var(--brand-border)', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:32,height:32,borderRadius:8,background:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <AlertCircle size={16} color="white"/>
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--brand)', marginBottom:4 }}>Transparência e responsabilidade</p>
                <p style={{ fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>Seu cadastro faz a diferença na construção de uma cidade melhor para todos.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main>
          <div className="dashboard-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, letterSpacing:'-0.5px', marginBottom:4 }}>Minhas Ocorrência</h1>
              <p style={{ color:'var(--text3)', fontSize:13 }}>Acompanhe o andamento das suas Ocorrência.</p>
            </div>
            <span style={{ background:'var(--brand-dim)', color:'var(--brand)', fontWeight:700, fontSize:14, padding:'5px 14px', borderRadius:99, border:'1px solid var(--brand-border)' }}>
              {reports.length} total
            </span>
          </div>

          {/* Tabs */}
          <div className="dashboard-tabs" style={{ display:'flex', gap:4, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} style={{ padding:'9px 16px', fontSize:13, fontWeight:tab===t.k?600:400, color:tab===t.k?'var(--brand)':'var(--text3)', background:'none', border:'none', cursor:'pointer', borderBottom:`2px solid ${tab===t.k?'var(--brand)':'transparent'}`, marginBottom:-1, fontFamily:'var(--font-body)', transition:'all .15s' }}>
                {t.l}
                <span style={{ marginLeft:6, fontSize:11, background:tab===t.k?'var(--brand-dim)':'var(--surface)', color:tab===t.k?'var(--brand)':'var(--text3)', padding:'1px 6px', borderRadius:99 }}>
                  {t.k==='todos'?reports.length:reports.filter(r=>r.status===t.k).length}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign:'center', padding:60 }}>
              <Loader size={28} style={{ animation:'spin .8s linear infinite', color:'var(--brand)', margin:'0 auto 12px', display:'block' }}/>
              <p style={{ color:'var(--text3)', fontSize:13 }}>Carregando Ocorrência...</p>
            </div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:60, background:'var(--bg2)', borderRadius:16, border:'1px solid var(--border)' }}>
              <p style={{ fontSize:32, marginBottom:12 }}>📋</p>
              <p style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, marginBottom:6 }}>Nenhuma Ocorrência encontrada</p>
              <p style={{ color:'var(--text3)', fontSize:13, marginBottom:20 }}>
                {tab==='todos' ? 'Você ainda não fez nenhuma Ocorrência.' : 'Nenhuma Ocorrência nessa categoria.'}
              </p>
              <Link to="/nova-ocorrencia" style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--brand)', color:'white', padding:'10px 20px', borderRadius:9, fontSize:14, fontWeight:600, textDecoration:'none' }}>
                <Plus size={14}/> Fazer primeira Ocorrência
              </Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {filtered.map(r=>{
                const cfg = STATUS_CFG[r.status]||STATUS_CFG.pendente
                const date = new Date(r.criado_em).toLocaleDateString('pt-BR')
                const protocol = `#VB-${new Date(r.criado_em).getFullYear()}-${r.id.substring(0,5).toUpperCase()}`
                return (
                  <div key={r.id} className="dashboard-card" style={{ background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)', padding:'16px 20px', display:'flex', alignItems:'center', gap:16, transition:'all .15s', cursor:'pointer' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--brand-border)';e.currentTarget.style.boxShadow='var(--shadow-sm)'}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none'}}>
                    <span style={{ fontSize:24, flexShrink:0 }}>{CAT_EMOJI[r.categoria]||'📍'}</span>
                    <div style={{ flex:1, overflow:'hidden' }}>
                      <p style={{ fontWeight:600, fontSize:14, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titulo}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-display)' }}>{protocol}</span>
                        <span style={{ fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:3 }}><Clock size={10}/>{date}</span>
                        <span style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>
                          {r.bairro ? `Bairro ${r.bairro}` : ''}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:cfg.bg, color:cfg.color, whiteSpace:'nowrap', flexShrink:0 }}>
                      {cfg.label}
                    </span>
                    <ChevronRight size={16} style={{ color:'var(--text3)', flexShrink:0 }}/>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
