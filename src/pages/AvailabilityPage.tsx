import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CampgroundSearch from '../components/CampgroundSearch'
import MonthSelector from '../components/MonthSelector'
import AvailabilityResults from '../components/AvailabilityResults'
import { useUrlState } from '../hooks/useUrlState'
import type { Campground } from '../types'

interface SearchParams {
  campgrounds: Campground[]
  year: number
  months: number[]
  minConsecutive: number
}

export default function AvailabilityPage() {
  const navigate = useNavigate()
  const { urlState, pushState } = useUrlState()

  const currentYear = new Date().getFullYear()

  const [campgrounds, setCampgrounds] = useState<Campground[]>(urlState.campgrounds ?? [])
  const [year, setYear] = useState<number>(urlState.year ?? currentYear)
  const [months, setMonths] = useState<number[]>(urlState.months ?? [])
  const [minConsecutive, setMinConsecutive] = useState(1)
  const [submitted, setSubmitted] = useState<SearchParams | null>(
    urlState.campgrounds?.length && urlState.months?.length
      ? { campgrounds: urlState.campgrounds, year: urlState.year ?? currentYear, months: urlState.months, minConsecutive: 1 }
      : null
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (campgrounds.length === 0) {
      setValidationError('Please search for and select at least one campground.')
      return
    }
    if (months.length === 0) {
      setValidationError('Please select at least one month.')
      return
    }
    setValidationError(null)
    const params: SearchParams = { campgrounds, year, months, minConsecutive }
    setSubmitted(params)
    pushState({ campgrounds, year, months })
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Top bar */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="font-serif text-2xl tracking-tight text-white hover:text-gray-300 transition-colors"
        >
          CampFinder
        </button>
        <span className="text-sm font-medium text-gray-400 hidden sm:block">
          Campsite Availability
        </span>
        <div />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-7 mb-10 space-y-7">

          <p className="text-sm text-gray-500 leading-relaxed">
            Search any campground on{' '}
            <a
              href="https://www.recreation.gov/search?inventory_type=camping"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 text-black hover:text-gray-600 transition-colors"
            >
              Recreation.gov
            </a>{' '}
            and see all available dates across any combination of parks and months.
          </p>

          <div className="h-px bg-gray-200" />

          {/* Campground search */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2.5">Campgrounds</label>
            <CampgroundSearch selected={campgrounds} onChange={setCampgrounds} />
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year-input" className="block text-sm font-semibold text-black mb-2.5">
              Year
            </label>
            <input
              id="year-input"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              min={currentYear}
              max={currentYear + 5}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:border-black transition-colors"
            />
          </div>

          {/* Months */}
          <div>
            <label className="block text-sm font-semibold text-black mb-2.5">Months</label>
            <MonthSelector selected={months} onChange={setMonths} />
          </div>

          {/* Consecutive nights filter */}
          <div>
            <label htmlFor="consecutive-input" className="block text-sm font-semibold text-black mb-2.5">
              Minimum consecutive nights
            </label>
            <div className="flex items-center gap-3">
              <input
                id="consecutive-input"
                type="number"
                value={minConsecutive}
                onChange={(e) => setMinConsecutive(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min={1}
                max={30}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:border-black transition-colors"
              />
              <span className="text-sm text-gray-400">
                {minConsecutive === 1
                  ? 'Show all available dates'
                  : `Only sites with ${minConsecutive}+ consecutive nights`}
              </span>
            </div>
          </div>

          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {validationError}
            </div>
          )}

          <div className="flex items-center gap-5 pt-1">
            <button
              type="submit"
              className="bg-black text-white rounded-full px-8 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Check Availability
            </button>
            {submitted && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="text-sm text-gray-400 hover:text-black underline underline-offset-2 transition-colors"
              >
                Copy shareable link
              </button>
            )}
          </div>
        </form>

        {/* Results */}
        {submitted && (
          <div>
            <h2 className="text-lg font-semibold text-black mb-6">Results</h2>
            {submitted.campgrounds.map((cg) => (
              <AvailabilityResults
                key={cg.id}
                campgroundId={cg.id}
                campgroundName={cg.name}
                year={submitted.year}
                months={submitted.months}
                minConsecutive={submitted.minConsecutive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
