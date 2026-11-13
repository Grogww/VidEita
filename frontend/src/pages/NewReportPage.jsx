import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import { ArrowLeft, ArrowRight, MapPin, CheckCircle, Loader, Sparkles, User, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../services/api'
import Navbar from '../components/ui/Navbar'
import PhotoAnalysisStep from '../components/reports/PhotoAnalysisStep'
import { useImageAnalysis } from '../hooks/useImageAnalysis'
import VideiraMap, { VIDEIRA_CENTER } from '../components/map/VideiraMap'

const CATS = [
  { v:'buraco',      l:'Buraco na via',       e:'🕳️' },
  { v:'lixo',        l:'Descarte irregular',  e:'🗑️' },
  { v:'iluminacao',  l:'Iluminação pública',  e:'💡' },
  { v:'calcada',     l:'Calçada danificada',  e:'🚶' },
  { v:'sinalizacao', l:'Sinalização',         e:'🚧' },
  { v:'esgoto',      l:'Esgoto',              e:'💧' },
  { v:'outro',       l:'Outro',               e:'📍' },
]

const PRIORIDADES = [
  { v:'baixa',   l:'Baixa' },
  { v:'media',   l:'Média' },
  { v:'alta',    l:'Alta' },
  { v:'urgente', l:'Urgente' },
]

const ORGAOS = [
  { v:'PREFEITURA', l:'Prefeitura' },
  { v:'CELESC',     l:'CELESC' },
  { v:'VISAN',      l:'VISAN' },
]

const CAMPOS_PADRAO = { categoria:'', titulo:'', descricao:'', prioridade:'media', orgao:'PREFEITURA' }

const STEPS = ['Foto','Informações','Detalhes','Localização','Confirmação']

function LocationPicker({ pos, setPos }) {
  useMapEvents({ click(e){ setPos([e.latlng.lat, e.latlng.lng]) } })
  return pos ? <Marker position={pos}/> : null
}

function MapAutoCenter({ pos }) {
  const map = useMap()

  useEffect(() => {
    if (!pos) return
    map.flyTo(pos, Math.max(map.getZoom(), 16), { duration: 0.8 })
  }, [map, pos])

  return null
}

export default function NewReportPage() {
  const [step, setStep]       = useState(0)
  const [cat, setCat]         = useState('')
  const [titulo, setTitulo]   = useState('')
  const [desc, setDesc]       = useState('')
  const [prioridade, setPrioridade] = useState(CAMPOS_PADRAO.prioridade)
  const [orgao, setOrgao]     = useState(CAMPOS_PADRAO.orgao)
  const [anonimo, setAnonimo] = useState(false)
  const [pos, setPos]         = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [locating, setLocating] = useState(false)
  const [img, setImg]         = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [protocol, setProtocol] = useState(null)
  const [sugestoesAtivas, setSugestoesAtivas] = useState(false)
  const camposEditados = useRef(new Set())
  const analise = useImageAnalysis()
  const navigate = useNavigate()

  const setters = { categoria:setCat, titulo:setTitulo, descricao:setDesc, prioridade:setPrioridade, orgao:setOrgao }

  const editarCampo = (campo, valor) => {
    camposEditados.current.add(campo)
    setters[campo](valor)
  }

  // A IA nunca sobrescreve o que o usuário já digitou.
  const preencherCampos = (valores) => {
    Object.entries(valores).forEach(([campo, valor]) => {
      if (!camposEditados.current.has(campo)) setters[campo](valor)
    })
  }

  const ignorarSugestoes = () => {
    preencherCampos(CAMPOS_PADRAO)
    setSugestoesAtivas(false)
  }

  const handleImg = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 15*1024*1024) { toast.error('Imagem muito grande (máx 15MB)'); return }
    setImg(f); setPreview(URL.createObjectURL(f))

    const resultado = await analise.analisar(f)
    if (resultado?.sugestoes) {
      preencherCampos(resultado.sugestoes)
      setSugestoesAtivas(true)
    }
  }

  const removerFoto = () => {
    analise.limpar()
    setImg(null); setPreview(null)
    ignorarSugestoes()
  }

  const tentarAnaliseNovamente = async () => {
    const resultado = await analise.analisar(img)
    if (resultado?.sugestoes) {
      preencherCampos(resultado.sugestoes)
      setSugestoesAtivas(true)
    }
  }

  const novaOcorrencia = () => {
    analise.limpar()
    camposEditados.current.clear()
    setStep(0);setCat('');setTitulo('');setDesc('');setPrioridade(CAMPOS_PADRAO.prioridade);setOrgao(CAMPOS_PADRAO.orgao)
    setPos(null);setLocationAccuracy(null);setImg(null);setPreview(null);setSugestoesAtivas(false)
  }


  const usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta localização automática')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setPos([latitude, longitude])
        setLocationAccuracy(Math.round(accuracy || 0))
        toast.success('Localização atual marcada no mapa')
        setLocating(false)
      },
      (error) => {
        let msg = 'Não foi possível obter sua localização'
        if (error.code === 1) msg = 'Permissão de localização negada pelo navegador'
        if (error.code === 2) msg = 'Localização indisponível neste momento'
        if (error.code === 3) msg = 'Tempo esgotado ao buscar localização'
        toast.error(msg)
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const marcarLocalManual = (novaPos) => {
    setPos(novaPos)
    setLocationAccuracy(null)
  }

  const canNext = () => {
    if (step===0) return analise.podeAvancar
    if (step===1) return !!cat
    if (step===2) return titulo.trim().length >= 3
    if (step===3) return !!pos
    return true
  }

  const submit = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('titulo', titulo); fd.append('descricao', desc)
      fd.append('categoria', cat); fd.append('latitude', pos[0]); fd.append('longitude', pos[1]); if (locationAccuracy) fd.append('precisao_metros', locationAccuracy)
      fd.append('anonimo', anonimo)
      fd.append('prioridade', prioridade); fd.append('orgao', orgao)
      if (img) { fd.append('imagem', img); fd.append('analise_id', analise.analiseId) }
      const { data } = await reportsApi.criar(fd)
      const id = data.data?.report?.id || ''
      setProtocol(`#VB-${new Date().getFullYear()}-${id.substring(0,5).toUpperCase()}`)
      setStep(5)
    } catch (err) {
      toast.error(err.response?.data?.mensagem || 'Erro ao criar Ocorrência')
    } finally { setLoading(false) }
  }

  // Success screen
  if (step===5) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar/>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 60px)', padding:24 }}>
        <div className="fade-up" style={{ textAlign:'center', maxWidth:400 }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'var(--brand-dim)',border:'2px solid var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px' }}>
            <CheckCircle size={36} color="var(--brand)"/>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, marginBottom:8 }}>Ocorrência enviada!</h2>
          <p style={{ color:'var(--text2)', fontSize:15, marginBottom:28 }}>Obrigado por contribuir com a sua cidade. Sua Ocorrência foi recebida com sucesso.</p>
          <div style={{ background:'var(--bg3)', borderRadius:14, padding:24, marginBottom:28, border:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, color:'var(--text3)', marginBottom:8 }}>Protocolo</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--brand)', letterSpacing:1 }}>{protocol}</p>
            <p style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>Guarde este número para acompanhar o andamento da sua Ocorrência.</p>
          </div>
          <div className="success-actions" style={{ display:'flex', gap:10 }}>
            <button onClick={()=>navigate('/minhas-ocorrencias')} style={{ flex:1, padding:'12px 0', background:'var(--brand)', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>
              Acompanhar Ocorrência
            </button>
            <button onClick={novaOcorrencia} style={{ flex:1, padding:'12px 0', background:'var(--bg2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>
              Fazer nova Ocorrência
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Navbar/>
      <div className="newreport-container" style={{ maxWidth:720, margin:'0 auto', padding:'40px 24px' }}>

        {/* Steps indicator */}
        <div className="newreport-steps" style={{ display:'flex', alignItems:'center', gap:0, marginBottom:40 }}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', flex: i<STEPS.length-1?1:'auto' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,transition:'all .2s',
                  background: i<step?'var(--brand)':i===step?'var(--brand)':'var(--surface)',
                  color: i<=step?'white':'var(--text3)',
                  border: i===step?'3px solid var(--brand-light)':'3px solid transparent',
                }}>
                  {i<step?<CheckCircle size={14}/>:i+1}
                </div>
                <span style={{ fontSize:11, fontWeight:i===step?600:400, color:i===step?'var(--brand)':'var(--text3)', whiteSpace:'nowrap' }}>{s}</span>
              </div>
              {i<STEPS.length-1&&<div style={{ flex:1, height:2, background:i<step?'var(--brand)':'var(--border)', margin:'0 8px', marginBottom:20, transition:'background .3s' }}/>}
            </div>
          ))}
        </div>

        <div className="slide-in newreport-card" style={{ background:'var(--bg2)', borderRadius:20, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
          <div className="newreport-card-head" style={{ padding:'28px 32px', borderBottom:'1px solid var(--border)' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, marginBottom:4 }}>Nova Ocorrência</h2>
            <p style={{ color:'var(--text3)', fontSize:13 }}>Preencha as informações abaixo para nos ajudar a entender melhor a ocorrência.</p>
          </div>

          <div className="newreport-card-body" style={{ padding:'28px 32px' }}>

            {/* Step 0: foto */}
            {step===0&&(
              <PhotoAnalysisStep
                preview={preview}
                nomeArquivo={img?.name}
                estado={analise.estado}
                mensagem={analise.mensagem}
                sugestoesAtivas={sugestoesAtivas}
                onSelect={handleImg}
                onRemove={removerFoto}
                onRetry={tentarAnaliseNovamente}
                onIgnorar={ignorarSugestoes}
              />
            )}

            {/* Step 1: categoria */}
            {step===1&&(
              <div>
                {sugestoesAtivas&&<div style={{ marginBottom:16 }}><Aviso/></div>}
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:14, letterSpacing:.3 }}>CATEGORIA DA OCORRÊNCIA</p>
                <div className="newreport-category-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {CATS.map(c=>(
                    <button key={c.v} onClick={()=>editarCampo('categoria',c.v)} style={{ padding:'14px 16px', borderRadius:10, border:`1.5px solid ${cat===c.v?'var(--brand)':'var(--border)'}`, background:cat===c.v?'var(--brand-dim)':'var(--bg3)', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:14, color:cat===c.v?'var(--brand)':'var(--text)', fontFamily:'var(--font-body)', fontWeight:cat===c.v?600:400, transition:'all .15s', textAlign:'left' }}>
                      <span style={{ fontSize:20 }}>{c.e}</span> {c.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: título + desc + prioridade + órgão + anônimo */}
            {step===2&&(
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {sugestoesAtivas&&<Aviso/>}
                <Field label="Título">
                  <input type="text" placeholder="Resuma sua Ocorrência em poucas palavras" value={titulo} onChange={e=>editarCampo('titulo',e.target.value)} required maxLength={150} style={inp}/>
                </Field>
                <Field label="Descrição">
                  <textarea placeholder="Descreva o que aconteceu com o máximo de detalhes possível" value={desc} onChange={e=>editarCampo('descricao',e.target.value)} rows={4} maxLength={1000} style={{ ...inp, resize:'vertical', minHeight:100 }}/>
                  <span style={{ fontSize:11, color:'var(--text3)', float:'right', marginTop:4 }}>{desc.length}/1000</span>
                </Field>
                <Field label="Prioridade">
                  <select value={prioridade} onChange={e=>editarCampo('prioridade',e.target.value)} style={inp}>
                    {PRIORIDADES.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </Field>
                <Field label="Órgão responsável">
                  <select value={orgao} onChange={e=>editarCampo('orgao',e.target.value)} style={inp}>
                    {ORGAOS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </Field>
                <Field label="Deseja se identificar?" last>
                  <div className="newreport-choice-grid" style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>setAnonimo(false)} style={{ flex:1, padding:'11px 0', borderRadius:9, border:`1.5px solid ${!anonimo?'var(--brand)':'var(--border)'}`, background:!anonimo?'var(--brand-dim)':'var(--bg3)', color:!anonimo?'var(--brand)':'var(--text2)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', fontWeight:!anonimo?600:400, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                      <User size={14}/> Sim, quero me identificar
                    </button>
                    <button onClick={()=>setAnonimo(true)} style={{ flex:1, padding:'11px 0', borderRadius:9, border:`1.5px solid ${anonimo?'var(--brand)':'var(--border)'}`, background:anonimo?'var(--brand-dim)':'var(--bg3)', color:anonimo?'var(--brand)':'var(--text2)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', fontWeight:anonimo?600:400, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                      <UserX size={14}/> Não, quero permanecer anônimo
                    </button>
                  </div>
                </Field>
              </div>
            )}

            {/* Step 3: localização */}
            {step===3&&(
              <div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                  <button type="button" onClick={usarMinhaLocalizacao} disabled={locating} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px 14px', background:locating?'var(--surface)':'var(--brand)', color:locating?'var(--text3)':'white', border:'none', borderRadius:10, cursor:locating?'not-allowed':'pointer', fontSize:14, fontWeight:700, fontFamily:'var(--font-body)', boxShadow:locating?'none':'0 4px 16px rgba(107,63,160,.25)' }}>
                    {locating ? <Loader size={16} style={{ animation:'spin .8s linear infinite' }}/> : <MapPin size={16}/>} 
                    {locating ? 'Buscando sua localização...' : 'Usar minha localização atual'}
                  </button>

                  {!pos&&(
                    <div style={{ background:'var(--brand-dim)', border:'1px solid var(--brand-border)', borderRadius:9, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--brand)', fontWeight:500 }}>
                      <MapPin size={14}/> Use sua localização atual ou clique no mapa para marcar o local da ocorrência.
                    </div>
                  )}
                  {pos&&(
                    <div style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:9, padding:'10px 14px', display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#16A34A', fontWeight:500, flexWrap:'wrap' }}>
                      <CheckCircle size={14}/> Localização marcada: {pos[0].toFixed(5)}, {pos[1].toFixed(5)}
                      {locationAccuracy ? <span style={{ color:'#15803D' }}>· precisão aprox. {locationAccuracy}m</span> : null}
                    </div>
                  )}
                </div>
                <div className="newreport-map" style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', height:360 }}>
                  <VideiraMap center={pos || VIDEIRA_CENTER} zoom={pos ? 16 : 14} style={{ cursor:'crosshair' }}>
                    <MapAutoCenter pos={pos}/>
                    <LocationPicker pos={pos} setPos={marcarLocalManual}/>
                  </VideiraMap>
                </div>
              </div>
            )}

            {/* Step 4: confirmação */}
            {step===4&&(
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <SummaryRow label="Categoria"    val={CATS.find(c=>c.v===cat)?.l||cat} emoji={CATS.find(c=>c.v===cat)?.e}/>
                <SummaryRow label="Título"       val={titulo}/>
                {desc&&<SummaryRow label="Descrição" val={desc}/>}
                <SummaryRow label="Prioridade"   val={PRIORIDADES.find(p=>p.v===prioridade)?.l}/>
                <SummaryRow label="Órgão"        val={ORGAOS.find(o=>o.v===orgao)?.l}/>
                <SummaryRow label="Localização"  val={pos?`${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}${locationAccuracy ? ` · precisão aprox. ${locationAccuracy}m` : ''}`:'Não informada'}/>
                <SummaryRow label="Identificação" val={anonimo?'Anônimo':'Identificado'}/>
                {preview&&(
                  <div>
                    <p style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:8, letterSpacing:.3 }}>FOTO</p>
                    <img src={preview} alt="foto" style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }}/>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div className="newreport-actions" style={{ padding:'20px 32px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg3)' }}>
            <button onClick={()=>setStep(s=>s-1)} disabled={step===0} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', background:'none', border:'1px solid var(--border)', borderRadius:9, color:step===0?'var(--text3)':'var(--text)', cursor:step===0?'not-allowed':'pointer', fontSize:14, fontFamily:'var(--font-body)', opacity:step===0?.4:1 }}>
              <ArrowLeft size={14}/> Voltar
            </button>

            <div style={{ display:'flex', gap:6 }}>
              {STEPS.map((_,i)=>(
                <div key={i} style={{ width:i===step?20:7, height:7, borderRadius:99, background:i<=step?'var(--brand)':'var(--border)', transition:'all .2s' }}/>
              ))}
            </div>

            {step<4?(
              <button onClick={()=>setStep(s=>s+1)} disabled={!canNext()} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', background:'var(--brand)', border:'none', borderRadius:9, color:'white', cursor:canNext()?'pointer':'not-allowed', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)', opacity:canNext()?1:.5, boxShadow:'0 3px 12px rgba(107,63,160,.3)' }}>
                Continuar <ArrowRight size={14}/>
              </button>
            ):(
              <button onClick={submit} disabled={loading} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:loading?'var(--surface)':'var(--brand)', border:'none', borderRadius:9, color:loading?'var(--text3)':'white', cursor:loading?'not-allowed':'pointer', fontSize:14, fontWeight:600, fontFamily:'var(--font-body)', boxShadow:loading?'none':'0 3px 12px rgba(107,63,160,.3)' }}>
                {loading&&<Loader size={14} style={{ animation:'spin .8s linear infinite' }}/>}
                {loading?'Enviando...':'Enviar Ocorrência'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, last }) {
  return (
    <div style={{ marginBottom:last?0:0 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:7, letterSpacing:.3 }}>{label.toUpperCase()}</label>
      {children}
    </div>
  )
}

function Aviso() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:9, background:'var(--brand-dim)', border:'1px solid var(--brand-border)', color:'var(--brand)', fontSize:12, fontWeight:500 }}>
      <Sparkles size={14} style={{ flexShrink:0 }}/> Sugerido a partir da foto. Revise e edite o que precisar.
    </div>
  )
}

function SummaryRow({ label, val, emoji }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 14px', background:'var(--bg3)', borderRadius:9, border:'1px solid var(--border)' }}>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', width:90, flexShrink:0, paddingTop:2 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize:14, color:'var(--text)' }}>{emoji?`${emoji} `:''}{val}</span>
    </div>
  )
}

const inp = { width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--text)', fontSize:14, outline:'none', fontFamily:'var(--font-body)' }