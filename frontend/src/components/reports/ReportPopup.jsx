import { useState } from 'react'
import { MapPin, Clock, Tag, User, Loader, Circle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { reportsApi } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  pendente:     { label:'Pendente',     color:'#F59E0B', bg:'#FEF3C7' },
  em_analise:   { label:'Em análise',   color:'#3B82F6', bg:'#DBEAFE' },
  em_andamento: { label:'Em andamento', color:'#8B5CF6', bg:'#EDE9FE' },
  resolvido:    { label:'Resolvido',    color:'#22C55E', bg:'#DCFCE7' },
  rejeitado:    { label:'Rejeitado',    color:'#EF4444', bg:'#FEE2E2' },
}
const CAT_EMOJI = { buraco:'🕳️', lixo:'🗑️', iluminacao:'💡', calcada:'🚶', sinalizacao:'🚧', esgoto:'💧', outro:'📍' }

export default function ReportPopup({ report, onStatusChange }) {
  const { user }      = useAuth()
  const [loading, setLoading] = useState(false)
  const cfg = STATUS_CFG[report.status] || STATUS_CFG.pendente

  const changeStatus = async (status) => {
    setLoading(true)
    try { await reportsApi.atualizarStatus(report.id, status); toast.success('Status atualizado!'); onStatusChange?.() }
    catch { toast.error('Falha ao atualizar') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding:16, minWidth:240, maxWidth:280, fontFamily:'var(--font-body)' }}>
      {report.imagem_url&&(
        <img src={report.imagem_url} alt={report.titulo} style={{ width:'100%', height:110, objectFit:'cover', borderRadius:8, marginBottom:12 }}/>
      )}
      <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{CAT_EMOJI[report.categoria]||'📍'}</span>
        <div>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text)', lineHeight:1.3, marginBottom:4 }}>{report.titulo}</p>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'2px 8px', background:cfg.bg, color:cfg.color, borderRadius:99 }}>
            <Circle size={4} fill={cfg.color} stroke="none"/> {cfg.label}
          </span>
        </div>
      </div>
      {report.descricao&&<p style={{ fontSize:12, color:'var(--text2)', marginBottom:10, lineHeight:1.5 }}>{report.descricao}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:5, paddingTop:8, borderTop:'1px solid var(--border)' }}>
        <Row icon={<Tag size={11}/>} text={report.categoria}/>
        {report.autor&&<Row icon={<User size={11}/>} text={report.autor.nome}/>}
        <Row icon={<Clock size={11}/>} text={new Date(report.criado_em).toLocaleDateString('pt-BR')}/>
      </div>
      {user?.role==='admin'&&(
        <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
          <p style={{ fontSize:10, fontWeight:700, color:'var(--text3)', marginBottom:7, letterSpacing:.4 }}>ATUALIZAR STATUS</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {Object.entries(STATUS_CFG).map(([s,c])=>(
              <button key={s} disabled={loading||report.status===s} onClick={()=>changeStatus(s)} style={{ fontSize:10, fontWeight:600, padding:'3px 8px', border:`1px solid ${c.color}44`, borderRadius:99, cursor:report.status===s?'default':'pointer', background:report.status===s?c.bg:'transparent', color:report.status===s?c.color:'var(--text3)', fontFamily:'var(--font-body)', transition:'all .12s' }}>
                {loading?<Loader size={9} style={{ animation:'spin .8s linear infinite' }}/>:c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text2)', fontSize:12 }}>
      <span style={{ color:'var(--text3)' }}>{icon}</span>
      <span style={{ textTransform:'capitalize' }}>{text}</span>
    </div>
  )
}
