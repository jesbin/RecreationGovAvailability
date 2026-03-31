import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchCampgroundsNearLocation } from '../api'
import type { Campground, NearbyCampground } from '../types'

// Leaflet's default icon asset paths break with bundlers; fix them here
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

interface Props {
  selected: Campground[]
  onAdd: (campground: Campground) => void
}

type Status = 'idle' | 'locating' | 'fetching' | 'done' | 'error'

const userIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: '',
})

const cgIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#15803d;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.35);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
})

export default function NearbyFinder({ selected, onAdd }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [campgrounds, setCampgrounds] = useState<NearbyCampground[]>([])
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Init map once status reaches 'done'
  useEffect(() => {
    if (status !== 'done' || !mapContainerRef.current || !userCoords) return
    if (mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current).setView([userCoords.lat, userCoords.lng], 9)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(mapRef.current)

    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup('<b>You are here</b>')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Add campground pins whenever results arrive (separate from map init)
  useEffect(() => {
    if (!mapRef.current || campgrounds.length === 0) return

    campgrounds.forEach((cg) => {
      if (cg.lat == null || cg.lng == null) return
      const marker = L.marker([cg.lat, cg.lng], { icon: cgIcon }).addTo(mapRef.current!)
      const already = selected.some((s) => s.id === cg.id)
      marker.bindPopup(`
        <div style="font-family:inherit;min-width:150px;">
          <div style="font-weight:600;margin-bottom:2px;">${cg.name}</div>
          ${cg.location ? `<div style="color:#555;font-size:0.85em;">${cg.location}</div>` : ''}
          ${cg.distanceMiles != null ? `<div style="color:#777;font-size:0.8em;">${cg.distanceMiles.toFixed(1)} mi away</div>` : ''}
          ${already ? '<div style="color:#777;font-size:0.8em;margin-top:4px;">Already added</div>' : `<button data-id="${cg.id}" style="margin-top:6px;background:#111;color:white;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:0.85em;">+ Add to Search</button>`}
        </div>
      `)
      marker.on('popupopen', () => {
        const btn = document.querySelector<HTMLButtonElement>(`button[data-id="${cg.id}"]`)
        if (btn) {
          btn.onclick = () => {
            handleAdd(cg)
            marker.closePopup()
          }
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campgrounds])

  function handleAdd(cg: NearbyCampground) {
    onAdd({ id: cg.id, name: cg.name, location: cg.location })
    setAddedIds((prev) => new Set(prev).add(cg.id))
  }

  function isAdded(cg: NearbyCampground) {
    return addedIds.has(cg.id) || selected.some((s) => s.id === cg.id)
  }

  function handleFindNearMe() {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.')
      setStatus('error')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords
        setUserCoords({ lat: latitude, lng: longitude })
        setStatus('fetching')
        try {
          const results = await fetchCampgroundsNearLocation(latitude, longitude)
          setCampgrounds(results)
          setStatus('done')
        } catch {
          setErrorMsg('Failed to fetch nearby campgrounds. Please try again.')
          setStatus('error')
        }
      },
      (err) => {
        setErrorMsg(
          err.code === GeolocationPositionError.PERMISSION_DENIED
            ? 'Location access denied. Please allow location access and try again.'
            : 'Could not determine your location.'
        )
        setStatus('error')
      }
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleFindNearMe}
          disabled={status === 'locating' || status === 'fetching'}
          className="inline-flex items-center gap-1.5 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>📍</span>
          {status === 'locating'
            ? 'Getting location…'
            : status === 'fetching'
              ? 'Searching nearby…'
              : 'Find Near Me'}
        </button>
        {status === 'error' && (
          <span className="text-sm text-red-600">{errorMsg}</span>
        )}
      </div>

      {status === 'done' && (
        <div className="mt-4 space-y-4">
          {/* Map — always shown once location is found */}
          <div
            ref={mapContainerRef}
            className="w-full rounded-xl border border-gray-200 overflow-hidden"
            style={{ height: 380 }}
          />

          {/* List or no-results message */}
          {campgrounds.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {campgrounds.length} nearby campgrounds
              </p>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {campgrounds.map((cg) => {
                  const added = isAdded(cg)
                  return (
                    <div key={cg.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1 pr-4">
                        <span className="text-sm font-medium text-gray-900">{cg.name}</span>
                        {cg.location && (
                          <span className="text-sm text-gray-400"> — {cg.location}</span>
                        )}
                        {cg.distanceMiles != null && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            ({cg.distanceMiles.toFixed(1)} mi)
                          </span>
                        )}
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
          ) : (
            <p className="text-sm text-gray-500">
              No campgrounds found within 75 miles. Try searching by name above.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
