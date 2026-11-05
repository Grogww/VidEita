import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, ArrowRight, Upload, MapPin, CheckCircle, Loader, Image, X, User, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../services/api'
import Navbar from '../components/ui/Navbar'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VIDEIRA_CENTER = [-27.0089, -51.1505]
const VIDEIRA_BOUNDS = [[-27.05, -51.21], [-26.97, -51.06]]

const CATS = [
  { v:'buraco',      l:'Buraco na via',       e:'🕳️' },
  { v:'lixo',        l:'Descarte irregular',  e:'🗑️' },
  { v:'iluminacao',  l:'Iluminação pública',  e:'💡' },
  { v:'calcada',     l:'Calçada danificada',  e:'🚶' },
  { v:'sinalizacao', l:'Sinalização',         e:'🚧' },
  { v:'esgoto',      l:'Esgoto',              e:'💧' },
  { v:'outro',       l:'Outro',               e:'📍' },
]

const STEPS = ['Informações','Detalhes','Localização','Confirmação']

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
  const [anonimo, setAnonimo] = useState(false)
  const [pos, setPos]         = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [locating, setLocating] = useState(false)
  const [img, setImg]         = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [protocol, setProtocol] = useState(null)
  const navigate = useNavigate()

  const handleImg = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 15*1024*1024) { toast.error('Imagem muito grande (máx 15MB)'); return }
    setImg(f); setPreview(URL.createObjectURL(f))
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
    if (step===0) return !!cat
    if (step===1) return titulo.trim().length >= 3
    if (step===2) return !!pos
    return true
  }

  const submit = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('titulo', titulo); fd.append('descricao', desc)
      fd.append('categoria', cat); fd.append('latitude', pos[0]); fd.append('longitude', pos[1]); if (locationAccuracy) fd.append('precisao_metros', locationAccuracy)
      fd.append('anonimo', anonimo)
      if (img) fd.append('imagem', img)
      const { data } = await reportsApi.criar(fd)
      const id = data.data?.report?.id || ''
      setProtocol(`#VB-${new Date().getFullYear()}-${id.substring(0,5).toUpperCase()}`)
      setStep(4)
    } catch (err) {
      toast.error(err.response?.data?.mensagem || 'Erro ao criar Ocorrência')
    } finally { setLoading(false) }
  }

  // Success screen
  if (step===4) return (
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
            <button onClick={()=>{ setStep(0);setCat('');setTitulo('');setDesc('');setPos(null);setLocationAccuracy(null);setImg(null);setPreview(null) }} style={{ flex:1, padding:'12px 0', background:'var(--bg2)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)' }}>
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

            {/* Step 0: categoria */}
            {step===0&&(
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:14, letterSpacing:.3 }}>CATEGORIA DA OCORRÊNCIA</p>
                <div className="newreport-category-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {CATS.map(c=>(
                    <button key={c.v} onClick={()=>setCat(c.v)} style={{ padding:'14px 16px', borderRadius:10, border:`1.5px solid ${cat===c.v?'var(--brand)':'var(--border)'}`, background:cat===c.v?'var(--brand-dim)':'var(--bg3)', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:14, color:cat===c.v?'var(--brand)':'var(--text)', fontFamily:'var(--font-body)', fontWeight:cat===c.v?600:400, transition:'all .15s', textAlign:'left' }}>
                      <span style={{ fontSize:20 }}>{c.e}</span> {c.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: título + desc + anônimo */}
            {step===1&&(
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <Field label="Título">
                  <input type="text" placeholder="Resuma sua Ocorrência em poucas palavras" value={titulo} onChange={e=>setTitulo(e.target.value)} required maxLength={150} style={inp}/>
                </Field>
                <Field label="Descrição">
                  <textarea placeholder="Descreva o que aconteceu com o máximo de detalhes possível" value={desc} onChange={e=>setDesc(e.target.value)} rows={4} maxLength={1000} style={{ ...inp, resize:'vertical', minHeight:100 }}/>
                  <span style={{ fontSize:11, color:'var(--text3)', float:'right', marginTop:4 }}>{desc.length}/1000</span>
                </Field>
                <Field label="Foto (opcional)">
                  {preview?(
                    <div style={{ position:'relative' }}>
                      <img src={preview} alt="preview" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }}/>
                      <button onClick={()=>{ setImg(null);setPreview(null) }} style={{ position:'absolute',top:8,right:8, background:'rgba(0,0,0,.6)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}><X size={14}/></button>
                    </div>
                  ):(
                    <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:24, border:'1.5px dashed var(--border2)', borderRadius:10, cursor:'pointer', background:'var(--bg3)', color:'var(--text3)' }}>
                      <Image size={24}/>
                      <span style={{ fontSize:13 }}>Clique para adicionar foto</span>
                      <span style={{ fontSize:11 }}>JPEG, PNG, WebP, HEIC ou HEIF · máx 15MB</span>
                      <input type="file" accept="image/*,.heic,.heif" onChange={handleImg} style={{ display:'none' }}/>
                    </label>
                  )}
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

            {/* Step 2: localização */}
            {step===2&&(
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
                  <MapContainer center={pos || VIDEIRA_CENTER} zoom={pos ? 16 : 14} maxBounds={VIDEIRA_BOUNDS} maxBoundsViscosity={0.6} minZoom={12} maxZoom={18} style={{ height:'100%', width:'100%', cursor:'crosshair' }} zoomControl={false}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    <MapAutoCenter pos={pos}/>
                    <LocationPicker pos={pos} setPos={marcarLocalManual}/>
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Step 3: confirmação */}
            {step===3&&(
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <SummaryRow label="Categoria"    val={CATS.find(c=>c.v===cat)?.l||cat} emoji={CATS.find(c=>c.v===cat)?.e}/>
                <SummaryRow label="Título"       val={titulo}/>
                {desc&&<SummaryRow label="Descrição" val={desc}/>}
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

            {step<3?(
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

function SummaryRow({ label, val, emoji }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 14px', background:'var(--bg3)', borderRadius:9, border:'1px solid var(--border)' }}>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', width:90, flexShrink:0, paddingTop:2 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize:14, color:'var(--text)' }}>{emoji?`${emoji} `:''}{val}</span>
    </div>
  )
}

const inp = { width:'100%', padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--text)', fontSize:14, outline:'none', fontFamily:'var(--font-body)' }