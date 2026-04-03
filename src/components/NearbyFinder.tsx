import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { haversineDistanceMiles } from '../api'
import type { Campground } from '../types'

// Fix Leaflet default icon paths broken by Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface StaticCampground {
  id: string
  name: string
  lat: number
  lng: number
  state: string
}

interface NearbyEntry extends StaticCampground {
  distanceMiles: number
}

interface Props {
  selected: Campground[]
  onAdd: (campground: Campground) => void
}

const cgIcon = L.divIcon({
  html: '<div style="width:10px;height:10px;border-radius:50%;background:#15803d;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.35);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
})

const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
})

export default function NearbyFinder({ selected, onAdd }: Props) {
  const [allCampgrounds, setAllCampgrounds] = useState<StaticCampground[]>([])
  const [loadError, setLoadError] = useState(false)
  const [nearbyList, setNearbyList] = useState<NearbyEntry[]>([])
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  // Load static campgrounds.json on mount
  useEffect(() => {
    fetch('/campgrounds.json')
      .then((r) => r.json())
      .then((data: StaticCampground[]) => setAllCampgrounds(data))
      .catch(() => setLoadError(true))
  }, [])

  // Init map once container is in DOM
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current, { preferCanvas: true }).setView([39.5, -98.35], 4)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(mapRef.current)

    clusterRef.current = L.markerClusterGroup({ chunkedLoading: true })
    mapRef.current.addLayer(clusterRef.current)
  }, [])

  // Add campground markers when static data loads
  useEffect(() => {
    if (!clusterRef.current || allCampgrounds.length === 0) return

    clusterRef.current.clearLayers()
    allCampgrounds.forEach((cg) => {
      const marker = L.marker([cg.lat, cg.lng], { icon: cgIcon })
      const alreadySel = selected.some((s) => s.id === cg.id)
      marker.bindPopup(buildPopupHtml(cg, alreadySel))
      marker.on('popupopen', () => wirePopupButton(cg, marker))
      clusterRef.current!.addLayer(marker)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCampgrounds])

  function buildPopupHtml(cg: StaticCampground, alreadySel: boolean) {
    return `
      <div style="font-family:inherit;min-width:155px;">
        <div style="font-weight:600;margin-bottom:2px;">${cg.name}</div>
        ${cg.state ? `<div style="color:#555;font-size:0.85em;">${cg.state}</div>` : ''}
        ${alreadySel
          ? '<div style="color:#777;font-size:0.8em;margin-top:4px;">Already added</div>'
          : `<button data-id="${cg.id}" style="margin-top:6px;background:#111;color:white;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:0.85em;">+ Add to Search</button>`
        }
      </div>
    `
  }

  function wirePopupButton(cg: StaticCampground, marker: L.Marker) {
    const btn = document.querySelector<HTMLButtonElement>(`button[data-id="${cg.id}"]`)
    if (btn) {
      btn.onclick = () => {
        handleAdd(cg)
        marker.closePopup()
      }
    }
  }

  function handleAdd(cg: StaticCampground) {
    onAdd({ id: cg.id, name: cg.name })
    setAddedIds((prev) => new Set(prev).add(cg.id))
  }

  function isAdded(id: string) {
    return addedIds.has(id) || selected.some((s) => s.id === id)
  }

  function handleFindNearMe() {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        const { latitude, longitude } = coords

        // Place/move user marker
        if (mapRef.current) {
          if (userMarkerRef.current) userMarkerRef.current.remove()
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapRef.current)
            .bindPopup('<b>You are here</b>')
          mapRef.current.setView([latitude, longitude], 9)
        }

        // Compute nearby list from static data
        const nearby = allCampgrounds
          .map((cg) => ({ ...cg, distanceMiles: haversineDistanceMiles(latitude, longitude, cg.lat, cg.lng) }))
          .filter((cg) => cg.distanceMiles <= 75)
          .sort((a, b) => a.distanceMiles - b.distanceMiles)
          .slice(0, 30)
        setNearbyList(nearby)
      },
      (err) => {
        setLocating(false)
        setLocError(
          err.code === GeolocationPositionError.PERMISSION_DENIED
            ? 'Location access denied. Please allow location access and try again.'
            : 'Could not determine your location.'
        )
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleFindNearMe}
          disabled={locating || allCampgrounds.length === 0}
          className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>📍</span>
          {locating ? 'Getting location…' : 'Find Near Me'}
        </button>
        {allCampgrounds.length > 0 && (
          <span className="text-xs text-gray-400">{allCampgrounds.length.toLocaleString()} federal campgrounds</span>
        )}
        {loadError && (
          <span className="text-xs text-amber-600">Map data unavailable — run <code>scripts/fetch-ridb-locations.js</code> in Replit to populate campgrounds.</span>
        )}
        {locError && <span className="text-sm text-red-600">{locError}</span>}
      </div>

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-xl border border-gray-200 overflow-hidden"
        style={{ height: 420 }}
      />

      {/* Nearby list */}
      {nearbyList.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {nearbyList.length} campgrounds within 75 miles
          </p>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {nearbyList.map((cg) => {
              const added = isAdded(cg.id)
              return (
                <div key={cg.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-sm font-medium text-gray-900">{cg.name}</span>
                    {cg.state && <span className="text-sm text-gray-400"> — {cg.state}</span>}
                    <span className="text-xs text-gray-400 ml-1.5">({cg.distanceMiles.toFixed(1)} mi)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(cg)}
                    disabled={added}
                    className="shrink-0 text-xs font-medium border rounded-full px-3 py-1 transition-colors disabled:cursor-default disabled:border-gray-200 disabled:text-gray-400 border-black text-black hover:bg-black hover:text-white disabled:hover:bg-white disabled:hover:text-gray-400"
                  >
                    {added ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
