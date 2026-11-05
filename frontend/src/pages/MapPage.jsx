import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { Filter, Plus, RefreshCw, Loader, MapPin, X, LocateFixed } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/ui/Navbar'
import ReportPopup from '../components/reports/ReportPopup'

// Videira-SC bounding box — limita o mapa à cidade
const VIDEIRA_CENTER = [-27.0089, -51.1505]
const VIDEIRA_BOUNDS = [[-27.075, -51.235], [-26.945, -51.035]]
const VIDEIRA_MIN_ZOOM = 13
const VIDEIRA_MAX_ZOOM = 18

const STATUS_CFG = {
  pendente: { label: 'Pendente', color: '#F59E0B', bg: '#FEF3C7' },
  em_analise: { label: 'Em análise', color: '#3B82F6', bg: '#DBEAFE' },
  em_andamento: { label: 'Em andamento', color: '#8B5CF6', bg: '#EDE9FE' },
  resolvido: { label: 'Resolvido', color: '#22C55E', bg: '#DCFCE7' },
  rejeitado: { label: 'Rejeitado', color: '#EF4444', bg: '#FEE2E2' },
}

const CATS = ['todas', 'buraco', 'lixo', 'iluminacao', 'calcada', 'sinalizacao', 'esgoto', 'outro']
const STATUSES = ['todos', 'pendente', 'em_analise', 'em_andamento', 'resolvido', 'rejeitado']

const CAT_EMOJI = {
  buraco: '🕳️',
  lixo: '🗑️',
  iluminacao: '💡',
  calcada: '🚶',
  sinalizacao: '🚧',
  esgoto: '💧',
  outro: '📍'
}

const normalizeStatus = (status) => {
  if (!status) return 'pendente'

  return String(status)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

const getStatusColor = (status) => {
  const key = normalizeStatus(status)
  return STATUS_CFG[key]?.color || STATUS_CFG.pendente.color || '#6B3FA0'
}

const makePinIcon = (status) => {
  const color = getStatusColor(status)

  return L.divIcon({
    className: 'videita-pin-marker',
    html: `
      <div style="
        width:42px;
        height:50px;
        display:flex;
        align-items:flex-start;
        justify-content:center;
      ">
        <svg
          width="22"
          height="30"
          viewBox="0 0 42 50"
          xmlns="http://www.w3.org/2000/svg"
          style="display:block;overflow:visible;"
        >
          <path
            d="M21 2C12.2 2 5 9.2 5 18C5 29.8 21 48 21 48C21 48 37 29.8 37 18C37 9.2 29.8 2 21 2Z"
            fill="${color}"
            stroke="#ffffff"
            stroke-width="4"
            stroke-linejoin="round"
          />
          <circle
            cx="21"
            cy="18"
            r="6"
            fill="#ffffff"
          />
        </svg>
      </div>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -46],
  })
}

// Constrains map view to Videira bounds
function BoundsEnforcer() {
  const map = useMap()

  useEffect(() => {
    map.setMaxBounds(VIDEIRA_BOUNDS)
    map.setMinZoom(VIDEIRA_MIN_ZOOM)
    map.setMaxZoom(VIDEIRA_MAX_ZOOM)

    const fixSize = () => {
      setTimeout(() => map.invalidateSize(), 120)
    }

    fixSize()
    window.addEventListener('resize', fixSize)
    window.addEventListener('orientationchange', fixSize)

    return () => {
      window.removeEventListener('resize', fixSize)
      window.removeEventListener('orientationchange', fixSize)
    }
  }, [map])

  return null
}

function FlyToUserLocation({ position }) {
  const map = useMap()

  useEffect(() => {
    if (!position) return
    map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.8 })
  }, [map, position])

  return null
}

export default function MapPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('todas')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [locating, setLocating] = useState(false)
  const { user } = useAuth()

  const fetch = useCallback(async () => {
    setLoading(true)

    try {
      const params = {}

      if (filterCat !== 'todas') params.categoria = filterCat
      if (filterStatus !== 'todos') params.status = filterStatus

      const { data } = await reportsApi.listar(params)
      setReports(data.data.reports || [])
    } catch {
      toast.error('Erro ao carregar Ocorrência')
    } finally {
      setLoading(false)
    }
  }, [filterCat, filterStatus])

  useEffect(() => {
    fetch()
  }, [fetch])

  const usarMinhaLocalizacao = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta localização automática')
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const point = [latitude, longitude]

        setUserLocation(point)
        setLocationAccuracy(Math.round(accuracy || 0))
        toast.success('Localização atual encontrada no mapa')
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

  const activeFilters =
    (filterCat !== 'todas' ? 1 : 0) +
    (filterStatus !== 'todos' ? 1 : 0)

  const validReports = reports.filter(r => {
    const lat = Number(r.latitude)
    const lng = Number(r.longitude)

    return Number.isFinite(lat) && Number.isFinite(lng)
  })

  return (
    <div
      className="map-page"
      style={{
        height: '100dvh',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Navbar />

      <div
        className="map-area"
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top bar */}
        <div
          className="map-topbar"
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--bg2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: 'var(--shadow)',
              fontFamily: 'var(--font-body)',
              transition: 'all .15s',
              ...(showFilters ? {
                background: 'var(--brand)',
                color: 'white',
                borderColor: 'var(--brand)'
              } : {})
            }}
          >
            <Filter size={14} />
            Filtros

            {activeFilters > 0 && (
              <span
                style={{
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  minWidth: 16,
                  textAlign: 'center'
                }}
              >
                {activeFilters}
              </span>
            )}
          </button>

          <div
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '8px 14px',
              fontSize: 13,
              color: 'var(--text2)',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              alignItems: 'center',
              gap: 7
            }}
          >
            {loading
              ? <Loader size={13} style={{ animation: 'spin .8s linear infinite', color: 'var(--brand)' }} />
              : <MapPin size={13} style={{ color: 'var(--brand)' }} />
            }

            {loading ? 'Carregando...' : `${reports.length} Ocorrência${reports.length !== 1 ? 's' : ''} em Videira`}
          </div>

          <button
            onClick={fetch}
            disabled={loading}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '8px 10px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow)',
              color: 'var(--text2)'
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <button
            className="map-locate-button"
            onClick={usarMinhaLocalizacao}
            disabled={locating}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              background: userLocation ? '#DBEAFE' : 'var(--bg2)',
              color: userLocation ? '#1D4ED8' : 'var(--text2)',
              border: `1px solid ${userLocation ? '#93C5FD' : 'var(--border)'}`,
              borderRadius: 9,
              padding: '8px 12px',
              cursor: locating ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body)'
            }}
          >
            {locating
              ? <Loader size={14} style={{ animation: 'spin .8s linear infinite' }} />
              : <LocateFixed size={14} />
            }

            <span>
              {locating ? 'Localizando...' : 'Minha localização'}
            </span>
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div
            className="fade-up map-filter-panel"
            style={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              boxShadow: 'var(--shadow-lg)',
              minWidth: 340
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14
                }}
              >
                Filtrar Ocorrência
              </span>

              <button
                onClick={() => setShowFilters(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <FilterGroup
              label="Categoria"
              opts={CATS}
              val={filterCat}
              set={setFilterCat}
              emoji={CAT_EMOJI}
            />

            <FilterGroup
              label="Status"
              opts={STATUSES}
              val={filterStatus}
              set={setFilterStatus}
              cfg={STATUS_CFG}
              last
            />

            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterCat('todas')
                  setFilterStatus('todos')
                }}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '7px 0',
                  fontSize: 12,
                  color: 'var(--danger)',
                  background: 'none',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* FAB */}
        {user && (
          <Link
            to="/nova-ocorrencia"
            className="map-fab"
            style={{
              position: 'absolute',
              bottom: 28,
              right: 20,
              zIndex: 1000,
              background: 'var(--brand)',
              color: 'white',
              borderRadius: 14,
              padding: '12px 20px',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(107,63,160,.4)',
              textDecoration: 'none',
              transition: 'all .2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(107,63,160,.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(107,63,160,.4)'
            }}
          >
            <Plus size={17} strokeWidth={2.5} />
            Nova Ocorrencia
          </Link>
        )}

        {/* Legend */}
        <div
          className="map-legend"
          style={{
            position: 'absolute',
            bottom: 28,
            left: 12,
            zIndex: 1000,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: 'var(--shadow)'
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text3)',
              marginBottom: 8,
              letterSpacing: .4
            }}
          >
            LEGENDA
          </p>

          {Object.entries(STATUS_CFG).map(([s, c]) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 5
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: c.color,
                  flexShrink: 0
                }}
              />

              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text2)',
                  textTransform: 'capitalize'
                }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>

        {/* Videira location badge */}
        <div
          className="map-location-badge"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            background: 'var(--bg2)',
            border: '1px solid var(--brand-border)',
            borderRadius: 9,
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <MapPin size={12} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>
            Videira — SC
          </span>
        </div>

        <MapContainer
          center={VIDEIRA_CENTER}
          zoom={14}
          maxBounds={VIDEIRA_BOUNDS}
          maxBoundsViscosity={0.85}
          minZoom={VIDEIRA_MIN_ZOOM}
          maxZoom={VIDEIRA_MAX_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <BoundsEnforcer />
          <FlyToUserLocation position={userLocation} />

          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={11}
              pathOptions={{
                color: '#ffffff',
                weight: 4,
                fillColor: '#2563EB',
                fillOpacity: 1,
                opacity: 1,
              }}
            >
              <Popup maxWidth={260}>
                <div style={{ padding: 4, background: '#ffffff' }}>
                  <strong style={{ color: 'var(--brand)' }}>
                    Sua localização atual
                  </strong>

                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text2)' }}>
                    {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                  </p>

                  {locationAccuracy ? (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text3)' }}>
                      Precisão aproximada: {locationAccuracy}m
                    </p>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          )}

          {validReports.map(r => {
            const lat = Number(r.latitude)
            const lng = Number(r.longitude)

            return (
              <Marker
                key={`${r.id}-${r.status}`}
                position={[lat, lng]}
                icon={makePinIcon(r.status)}
              >
                <Popup maxWidth={300} minWidth={260}>
                  <ReportPopup report={r} onStatusChange={fetch} />
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

function FilterGroup({ label, opts, val, set, emoji, cfg, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text3)',
          marginBottom: 7,
          letterSpacing: .4
        }}
      >
        {label.toUpperCase()}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {opts.map(o => {
          const active = val === o
          const color = cfg?.[o]?.color

          return (
            <button
              key={o}
              onClick={() => set(o)}
              style={{
                padding: '4px 11px',
                fontSize: 12,
                borderRadius: 99,
                border: `1px solid ${active ? (color || 'var(--brand)') : 'var(--border2)'}`,
                background: active ? (color ? `${color}18` : 'var(--brand-dim)') : 'transparent',
                color: active ? (color || 'var(--brand)') : 'var(--text2)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textTransform: 'capitalize',
                fontWeight: active ? 600 : 400,
                transition: 'all .12s'
              }}
            >
              {emoji?.[o] ? `${emoji[o]} ` : ''}
              {o.replace('_', ' ')}
            </button>
          )
        })}
      </div>
    </div>
  )
}