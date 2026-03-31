import { useCallback, useEffect, useState } from 'react'
import type { Campground } from '../types'

interface UrlState {
  campgrounds: Campground[]
  year: number
  months: number[]
}

function encode(state: UrlState): string {
  const params = new URLSearchParams()
  state.campgrounds.forEach((cg) => params.append('cg', `${cg.id}:${encodeURIComponent(cg.name)}`))
  params.set('year', String(state.year))
  state.months.forEach((m) => params.append('m', String(m)))
  return params.toString()
}

function decode(hash: string): Partial<UrlState> {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const campgrounds: Campground[] = []
  params.getAll('cg').forEach((raw) => {
    const idx = raw.indexOf(':')
    if (idx === -1) return
    campgrounds.push({ id: raw.slice(0, idx), name: decodeURIComponent(raw.slice(idx + 1)) })
  })
  const yearStr = params.get('year')
  const year = yearStr ? parseInt(yearStr, 10) : undefined
  const months = params.getAll('m').map(Number).filter((m) => m >= 1 && m <= 12)
  return {
    campgrounds: campgrounds.length ? campgrounds : undefined,
    year: year && !isNaN(year) ? year : undefined,
    months: months.length ? months : undefined,
  }
}

export function useUrlState() {
  const [urlState, setUrlState] = useState<Partial<UrlState>>(() => decode(window.location.hash))

  const pushState = useCallback((state: UrlState) => {
    window.location.hash = encode(state)
    setUrlState(state)
  }, [])

  useEffect(() => {
    const handler = () => setUrlState(decode(window.location.hash))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  return { urlState, pushState }
}
