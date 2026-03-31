import { useEffect, useState } from 'react'
import { fetchAndAggregate, fetchCampgroundInfo } from '../api'
import type { CampgroundInfo, SiteAvailableRun } from '../types'

interface Props {
  campgroundId: string
  campgroundName: string
  year: number
  months: number[]
  minConsecutive: number
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
    .sort((a, b) => a.site.localeCompare(b.site, undefined, { numeric: true }))
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(d: Date) {
  return `${DAY_ABBR[d.getDay()]} ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

export default function AvailabilityResults({
  campgroundId,
  campgroundName,
  year,
  months,
  minConsecutive,
}: Props) {
  const [info, setInfo] = useState<CampgroundInfo | null>(null)
  const [sites, setSites] = useState<SiteAvailableRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSites([])
    setInfo(null)

    fetchCampgroundInfo(campgroundId)
      .then(setInfo)
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

  const title = info?.facility_name ?? campgroundName ?? `Campground ${campgroundId}`

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            {info?.addresses?.[0] && (
              <p className="text-gray-400 text-sm mt-0.5">
                {info.addresses[0].city}, {info.addresses[0].state_code}
              </p>
            )}
          </div>
          {info && (
            <a
              href={`https://www.recreation.gov/camping/campgrounds/${campgroundId}`}
              target="_blank"
              rel="noreferrer"
              className="text-gray-300 hover:text-white text-sm underline underline-offset-2 whitespace-nowrap transition-colors"
            >
              View on Recreation.gov ↗
            </a>
          )}
        </div>
        {info && (info.facility_phone || info.facility_email) && (
          <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-2 text-gray-400 text-sm">
            {info.facility_phone && <span>{info.facility_phone}</span>}
            {info.facility_email && <span>{info.facility_email}</span>}
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          Loading availability…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      ) : sites.length === 0 ? (
        <p className="text-gray-400 text-sm py-2">
          No availability found{minConsecutive > 1 ? ` with ${minConsecutive}+ consecutive nights` : ''}.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-black">{sites.length}</span>{' '}
            {sites.length === 1 ? 'site' : 'sites'} available
            {minConsecutive > 1 && ` · ${minConsecutive}+ consecutive nights`}
          </p>
          <div className="flex flex-wrap gap-3">
            {sites.map(({ site, dates, maxConsecutive }) => (
              <div
                key={site}
                className="border border-gray-200 rounded-xl overflow-hidden min-w-[130px] shadow-sm"
              >
                <div className="bg-black text-white px-3 py-2">
                  <div className="text-sm font-semibold text-center">{site}</div>
                  {maxConsecutive > 1 && (
                    <div className="text-xs text-gray-400 text-center mt-0.5">
                      {maxConsecutive} nights max
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
