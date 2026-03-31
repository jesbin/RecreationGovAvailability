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

      // Calculate max consecutive nights
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
      <div className="bg-gray-900 text-white rounded-lg px-5 py-4 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {info && (
          <>
            <a
              href={`https://www.recreation.gov/camping/campgrounds/${campgroundId}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              Recreation.gov Page ↗
            </a>
            {info.addresses && info.addresses[0] && (
              <p className="text-gray-300 text-sm mt-1">
                {info.addresses[0].address1}, {info.addresses[0].city},{' '}
                {info.addresses[0].state_code} {info.addresses[0].postal_code}
              </p>
            )}
            {info.facility_email && (
              <p className="text-gray-300 text-sm">Email: {info.facility_email}</p>
            )}
            {info.facility_phone && (
              <p className="text-gray-300 text-sm">Phone: {info.facility_phone}</p>
            )}
          </>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <p className="text-gray-500 text-sm animate-pulse">Loading availability…</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
          Error: {error}
        </div>
      ) : sites.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No availability found for these dates
          {minConsecutive > 1 ? ` with ${minConsecutive}+ consecutive nights` : ''}.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-semibold text-black">{sites.length}</span> campsite
            {sites.length !== 1 ? 's' : ''} available
            {minConsecutive > 1 ? ` with ${minConsecutive}+ consecutive nights` : ''}
          </p>
          <div className="flex flex-wrap gap-3">
            {sites.map(({ site, dates, maxConsecutive }) => (
              <div
                key={site}
                className="border-2 border-black rounded-md overflow-hidden min-w-[120px]"
              >
                <div className="bg-black text-white text-center text-sm font-bold px-3 py-1.5">
                  {site}
                  {maxConsecutive > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">
                      ({maxConsecutive}n max)
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {dates.map((d) => (
                    <div key={d.toISOString()} className="text-center text-xs px-2 py-1 text-gray-700">
                      {d.toLocaleDateString()}
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
