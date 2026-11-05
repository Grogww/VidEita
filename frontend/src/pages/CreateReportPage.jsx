import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Upload, MapPin, X, CheckCircle, Loader, ArrowLeft, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../services/api'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CATEGORIAS = [
  { value: 'buraco',       label: '🕳️ Buraco'       },
  { value: 'lixo',         label: '🗑️ Lixo'          },
  { value: 'iluminacao',   label: '💡 Iluminação'    },
  { value: 'calcada',      label: '🚶 Calçada'       },
  { value: 'sinalizacao',  label: '🚧 Sinalização'   },
  { value: 'esgoto',       label: '💧 Esgoto'        },
  { value: 'outro',        label: '📍 Outro'         },
]

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]) },
  })
  return position ? <Marker position={position} /> : null
}

export default function CreateReportPage() {
  const [titulo, setTitulo]         = useState('')
  const [descricao, setDescricao]   = useState('')
  const [categoria, setCategoria]   = useState('')
  const [position, setPosition]     = useState(null)
  const [imagem, setImagem]         = useState(null)
  const [preview, setPreview]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx 5MB)'); return }
    setImagem(file)
    setPreview(URL.createObjectURL(file))
  }

  const removeImage = () => { setImagem(null); setPreview(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!position) { toast.error('Clique no mapa para indicar a localização'); return }
    if (!categoria) { toast.error('Selecione uma categoria'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('titulo', titulo)
      fd.append('descricao', descricao)
      fd.append('categoria', categoria)
      fd.append('latitude', position[0])
      fd.append('longitude', position[1])
      if (imagem) fd.append('imagem', imagem)

      await reportsApi.criar(fd)
      setSuccess(true)
      toast.success('Ocorrência registrada com sucesso!')
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      toast.error(err.response?.data?.mensagem || 'Erro ao criar Ocorrência')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(0,200,150,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--brand)',
        }}>
          <CheckCircle size={36} color="var(--brand)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>Ocorrência registrada!</h2>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Redirecionando para o mapa...</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* Left: Form */}
      <div style={{
        width: 400, flexShrink: 0, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)', overflowY: 'auto',
        padding: 24,
      }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--text3)',
          fontSize: 13, cursor: 'pointer', marginBottom: 24,
          fontFamily: 'var(--font-body)', padding: 0,
        }}>
          <ArrowLeft size={14} /> Voltar ao mapa
        </button>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Nova Ocorrência
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 28 }}>
          Clique no mapa para marcar o local do problema.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Titulo */}
          <Field label="Título *">
            <input
              type="text" placeholder="Ex: Buraco na Av. Brasil"
              value={titulo} onChange={e => setTitulo(e.target.value)}
              required maxLength={150}
              style={inputStyle}
            />
          </Field>

          {/* Categoria */}
          <Field label="Categoria *">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIAS.map(c => (
                <button key={c.value} type="button" onClick={() => setCategoria(c.value)} style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  border: `1px solid ${categoria === c.value ? 'var(--brand)' : 'var(--border2)'}`,
                  borderRadius: 8, background: categoria === c.value ? 'var(--brand-dim)' : 'var(--bg3)',
                  color: categoria === c.value ? 'var(--brand)' : 'var(--text2)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                }}>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Descricao */}
          <Field label="Descrição">
            <textarea
              placeholder="Descreva o problema em detalhes..."
              value={descricao} onChange={e => setDescricao(e.target.value)}
              rows={3} maxLength={1000}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </Field>

          {/* Localização indicator */}
          <Field label="Localização *">
            <div style={{
              padding: '10px 13px', borderRadius: 9,
              border: `1px solid ${position ? 'var(--brand)' : 'var(--border2)'}`,
              background: position ? 'var(--brand-dim)' : 'var(--bg3)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              color: position ? 'var(--brand)' : 'var(--text3)',
            }}>
              <MapPin size={14} />
              {position
                ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`
                : 'Clique no mapa →'}
            </div>
          </Field>

          {/* Image upload */}
          <Field label="Foto (opcional)" last>
            {preview ? (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="preview" style={{
                  width: '100%', height: 140, objectFit: 'cover',
                  borderRadius: 9, border: '1px solid var(--border2)',
                }} />
                <button type="button" onClick={removeImage} style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', border: 'none',
                  borderRadius: '50%', width: 26, height: 26,
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()} style={{
                width: '100%', padding: '20px 0', border: '1px dashed var(--border2)',
                borderRadius: 9, background: 'var(--bg3)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                color: 'var(--text3)', fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}>
                <Image size={22} />
                <span style={{ fontSize: 12 }}>Clique para adicionar foto</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>JPEG, PNG ou WebP · máx 5MB</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
          </Field>

          <button type="submit" disabled={loading} style={{
            width: '100%', marginTop: 24, padding: '13px 0',
            background: loading ? 'var(--surface2)' : 'var(--brand)',
            color: loading ? 'var(--text3)' : '#0E1117',
            border: 'none', borderRadius: 10, fontFamily: 'var(--font-body)',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            {loading && <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading ? 'Enviando...' : 'Registrar Ocorrência'}
          </button>
        </form>
      </div>

      {/* Right: Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!position && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'var(--bg2)', border: '1px solid var(--brand)',
            borderRadius: 10, padding: '8px 16px', fontSize: 13,
            color: 'var(--brand)', fontWeight: 500, boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <MapPin size={14} /> Clique no mapa para marcar o local
          </div>
        )}
        <MapContainer
          center={[-27.0086, -51.1519]}
          zoom={14}
          style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
    </div>
  )
}

function Field({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 7, letterSpacing: '0.4px' }}>
        {label.toUpperCase()}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 13px',
  background: 'var(--bg3)', border: '1px solid var(--border2)',
  borderRadius: 9, color: 'var(--text)', fontSize: 14,
  outline: 'none', transition: 'border-color 0.15s',
  fontFamily: 'var(--font-body)',
}
