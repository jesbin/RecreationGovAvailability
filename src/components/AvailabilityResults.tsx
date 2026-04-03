import { useEffect, useRef, useState } from 'react'
import {
  fetchAndAggregate,
  fetchCampgroundInfo,
  fetchFacilityDetail,
  fetchFacilityMedia,
  fetchFacilityActivities,
  fetchFacilityCampsites,
} from '../api'
import type {
  CampgroundInfo,
  FacilityDetail,
  FacilityMedia,
  FacilityActivity,
  FacilityCampsite,
  SiteAvailableRun,
} from '../types'
import AlertModal from './AlertModal'

interface Props {
  campgroundId: string
  campgroundName: string
  year: number
  months: number[]
  minConsecutive: number
}

type SiteFilter = 'all' | 'tent' | 'rv' | 'electric' | 'ada'

const ACTIVITY_ICONS: Record<string, string> = {
  Fishing: '🎣', Hiking: '🥾', Swimming: '🏊', Camping: '⛺', Biking: '🚲',
  'Mountain Biking': '🚵', 'Rock Climbing': '🧗', Kayaking: '🛶', Canoeing: '🛶',
  Horseback: '🐴', 'Horse Tethering': '🐴', Hunting: '🦌', Snowshoeing: '❄️',
  'Cross-Country Skiing': '⛷️', 'Wildlife Viewing': '🦅', Picnicking: '🧺',
  'Off-Highway Vehicle': '🚙', 'ATV Riding': '🚙',
}

function activityIcon(name: string) {
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return '🏕'
}

function getAvailableSites(
  campsites: Record<string, { site: string; availabilities: Record<string, string> }>,
  minConsecutive: number
): SiteAvailableRun[] {
  const AVAILABLE = 'Available'
  return Object.values(campsites)
    .map((cs) => {
      const dates = Object.entries(cs.availabilities)
        .filter(([, status]) => status === AVAILABLE)
        .map(([dt]) => new Date(dt))
        .sort((a, b) => a.getTime() - b.getTime())

      let maxConsecutive = 0
      if (dates.length > 0) {
        let run = 1
        for (let i = 1; i < dates.length; i++) {
          const diff = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
          if (Math.round(diff) === 1) {
            run++
            maxConsecutive = Math.max(maxConsecutive, run)
          } else {
            run = 1
          }
        }
        if (maxConsecutive === 0 && dates.length > 0) maxConsecutive = 1
      }

      return { site: cs.site, dates, maxConsecutive }
    })
    .filter((s) => s.dates.length > 0 && s.maxConsecutive >= minConsecutive)
    .sort((a, b) => b.maxConsecutive - a.maxConsecutive || a.site.localeCompare(b.site, undefined, { numeric: true }))
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(d: Date) {
  return `${DAY_ABBR[d.getDay()]} ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

function getSiteAttrs(site: string, campsiteMap: Map<string, FacilityCampsite>) {
  const cs = campsiteMap.get(site.toLowerCase()) ?? campsiteMap.get(site)
  if (!cs) return null
  const attrs = cs.ATTRIBUTES ?? []
  const hasElectric = attrs.some(a => a.AttributeName.toLowerCase().includes('electric') || a.AttributeName.toLowerCase().includes('hookup'))
  const maxPeople = attrs.find(a => a.AttributeName.toLowerCase().includes('max num of people'))?.AttributeValue
  const isADA = cs.CampsiteAccessible
  const type = cs.CampsiteType || ''
  const equipment = (cs.PERMITTEDEQUIPMENT ?? []).map(e => e.EquipmentName)
  const hasRV = equipment.some(e => e.toLowerCase().includes('rv')) || type.toLowerCase().includes('rv')
  return { hasElectric, maxPeople, isADA, type, hasRV, loop: cs.Loop }
}

export default function AvailabilityResults({
  campgroundId,
  campgroundName,
  year,
  months,
  minConsecutive,
}: Props) {
  const [info, setInfo] = useState<CampgroundInfo | null>(null)
  const [detail, setDetail] = useState<FacilityDetail | null>(null)
  const [media, setMedia] = useState<FacilityMedia[]>([])
  const [activities, setActivities] = useState<FacilityActivity[]>([])
  const [campsiteMap, setCampsiteMap] = useState<Map<string, FacilityCampsite>>(new Map())
  const [sites, setSites] = useState<SiteAvailableRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [filter, setFilter] = useState<SiteFilter>('all')
  const [alertOpen, setAlertOpen] = useState(false)
  const alertBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSites([])
    setInfo(null)
    setDetail(null)
    setMedia([])
    setActivities([])
    setCampsiteMap(new Map())
    setFilter('all')

    // Fire all fetches in parallel; RIDB calls never block availability display
    fetchCampgroundInfo(campgroundId).then(setInfo).catch(() => {})

    fetchFacilityDetail(campgroundId).then(setDetail).catch(() => {})
    fetchFacilityMedia(campgroundId)
      .then(items => setMedia(items.filter(m => m.MimeType?.startsWith('image') || m.URL?.match(/\.(jpg|jpeg|png|webp)/i)).slice(0, 6)))
      .catch(() => {})
    fetchFacilityActivities(campgroundId).then(setActivities).catch(() => {})
    fetchFacilityCampsites(campgroundId)
      .then(items => {
        const map = new Map<string, FacilityCampsite>()
        items.forEach(cs => {
          map.set(cs.CampsiteName?.toLowerCase(), cs)
          map.set(cs.CampsiteName, cs)
        })
        setCampsiteMap(map)
      })
      .catch(() => {})

    fetchAndAggregate(campgroundId, year, months)
      .then((agg) => {
        setSites(getAvailableSites(agg.campsites, minConsecutive))
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to fetch availability.')
        setLoading(false)
      })
  }, [campgroundId, year, months, minConsecutive])

  const title = detail?.FacilityName ?? info?.facility_name ?? campgroundName ?? `Campground ${campgroundId}`
  const phone = detail?.FacilityPhone ?? info?.facility_phone
  const email = detail?.FacilityEmail ?? info?.facility_email
  const city = detail?.FACILITYADDRESS?.[0]?.City ?? info?.addresses?.[0]?.city
  const state = detail?.FACILITYADDRESS?.[0]?.AddressStateCode ?? info?.addresses?.[0]?.state_code

  const filteredSites = sites.filter(({ site }) => {
    if (filter === 'all') return true
    const attrs = getSiteAttrs(site, campsiteMap)
    if (!attrs) return true
    if (filter === 'electric') return attrs.hasElectric
    if (filter === 'ada') return attrs.isADA
    if (filter === 'rv') return attrs.hasRV
    if (filter === 'tent') return !attrs.hasRV && attrs.type.toLowerCase().includes('tent')
    return true
  })

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {(city || state) && (
              <p className="text-gray-400 text-sm mt-0.5">{[city, state].filter(Boolean).join(', ')}</p>
            )}
            {detail?.StayLimit && (
              <p className="text-gray-500 text-xs mt-0.5">Stay limit: {detail.StayLimit}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {detail?.FacilityAdaAccess && detail.FacilityAdaAccess !== 'N' && (
              <span className="text-xs bg-blue-700 text-white rounded-full px-2 py-0.5">♿ ADA</span>
            )}
            <a
              href={`https://www.recreation.gov/camping/campgrounds/${campgroundId}`}
              target="_blank"
              rel="noreferrer"
              className="text-gray-300 hover:text-white text-sm underline underline-offset-2 whitespace-nowrap transition-colors"
            >
              View on Recreation.gov ↗
            </a>
          </div>
        </div>
        {(phone || email) && (
          <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-2 text-gray-400 text-sm">
            {phone && <span>{phone}</span>}
            {email && <span>{email}</span>}
          </div>
        )}

        {/* Activity badges */}
        {activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {activities.slice(0, 12).map(a => (
              <span key={a.ActivityID} className="inline-flex items-center gap-1 bg-gray-700 text-gray-200 text-xs rounded-full px-2.5 py-0.5">
                {activityIcon(a.ActivityName)} {a.ActivityName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Photo strip */}
      {media.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1">
          {media.map(m => (
            <img
              key={m.EntityMediaID}
              src={m.URL}
              alt={m.Title || title}
              className="h-36 w-52 object-cover rounded-lg shrink-0 border border-gray-100"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* About collapsible */}
      {(detail?.FacilityDescription || detail?.FacilityDirections) && (
        <div className="border border-gray-200 rounded-xl mt-2 overflow-hidden">
          <button
            type="button"
            onClick={() => setAboutOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>About this campground</span>
            <span className="text-gray-400">{aboutOpen ? '▲' : '▼'}</span>
          </button>
          {aboutOpen && (
            <div className="px-4 pb-4 space-y-3 text-sm text-gray-600 border-t border-gray-100">
              {detail.FacilityDescription && (
                <p className="mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: detail.FacilityDescription }} />
              )}
              {detail.FacilityDirections && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Getting there</p>
                  <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: detail.FacilityDirections }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Availability body */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading availability…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        ) : sites.length === 0 ? (
          <div>
            <p className="text-gray-400 text-sm py-2">
              No availability found{minConsecutive > 1 ? ` with ${minConsecutive}+ consecutive nights` : ''}.
            </p>
            <button
              ref={alertBtnRef}
              type="button"
              onClick={() => setAlertOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🔔 Notify me when sites open up
            </button>
          </div>
        ) : (
          <>
            {/* Stats + filter bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-black">{filteredSites.length}</span>{' '}
                {filteredSites.length === 1 ? 'site' : 'sites'} available
                {filter !== 'all' && ` · filtered`}
                {minConsecutive > 1 && ` · ${minConsecutive}+ consecutive nights`}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  {(['all', 'tent', 'rv', 'electric', 'ada'] as SiteFilter[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 font-medium transition-colors ${filter === f ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {f === 'all' ? 'All' : f === 'electric' ? '⚡ Electric' : f === 'ada' ? '♿ ADA' : f === 'rv' ? '🚐 RV' : '⛺ Tent'}
                    </button>
                  ))}
                </div>
                <button
                  ref={alertBtnRef}
                  type="button"
                  onClick={() => setAlertOpen(true)}
                  className="inline-flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  🔔 Set Alert
                </button>
              </div>
            </div>

            {/* Site cards */}
            <div className="flex flex-wrap gap-3">
              {filteredSites.map(({ site, dates, maxConsecutive }) => {
                const attrs = getSiteAttrs(site, campsiteMap)
                return (
                  <div key={site} className="border border-gray-200 rounded-xl overflow-hidden min-w-[130px] shadow-sm">
                    <div className="bg-black text-white px-3 py-2">
                      <div className="text-sm font-semibold text-center">{site}</div>
                      {maxConsecutive > 1 && (
                        <div className="text-xs text-gray-400 text-center mt-0.5">{maxConsecutive} nights max</div>
                      )}
                      {attrs && (
                        <div className="flex justify-center gap-1.5 mt-1 text-xs">
                          {attrs.isADA && <span title="ADA Accessible">♿</span>}
                          {attrs.hasElectric && <span title="Electric hookup">⚡</span>}
                          {attrs.hasRV && <span title="RV site">🚐</span>}
                          {attrs.maxPeople && <span title={`Max ${attrs.maxPeople} people`}>👥{attrs.maxPeople}</span>}
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100 bg-white">
                      {dates.map((d) => (
                        <div key={d.toISOString()} className="px-3 py-1.5 text-xs text-gray-700 text-center">
                          {formatDate(d)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {alertOpen && (
        <AlertModal
          campgroundId={campgroundId}
          campgroundName={title}
          year={year}
          months={months}
          minConsecutive={minConsecutive}
          onClose={() => setAlertOpen(false)}
        />
      )}
    </div>
  )
}
