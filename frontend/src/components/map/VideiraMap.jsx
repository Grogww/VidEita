import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

export const VIDEIRA_CENTER = [-27.0089, -51.1505]
const VIDEIRA_BOUNDS = [[-27.075, -51.235], [-26.945, -51.035]]
const MIN_ZOOM = 13
const MAX_ZOOM = 18
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// Impede que a área visível fique maior que Videira, o que trava o arraste em telas grandes.
function ZoomMinimoPelaTela() {
  const map = useMap()

  useEffect(() => {
    const ajustar = () => map.setMinZoom(Math.max(MIN_ZOOM, map.getBoundsZoom(VIDEIRA_BOUNDS, true)))
    ajustar()
    map.on('resize', ajustar)
    return () => map.off('resize', ajustar)
  }, [map])

  return null
}

export default function VideiraMap({ center = VIDEIRA_CENTER, zoom = 14, style, children }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={VIDEIRA_BOUNDS}
      maxBoundsViscosity={0.85}
      zoomControl={false}
      style={{ height: '100%', width: '100%', ...style }}
    >
      {/* Camada base em zoom fixo: cobre a cidade enquanto os tiles do zoom atual carregam */}
      <TileLayer url={TILE_URL} maxNativeZoom={MIN_ZOOM} />
      <TileLayer url={TILE_URL} keepBuffer={4} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <ZoomMinimoPelaTela />
      {children}
    </MapContainer>
  )
}
