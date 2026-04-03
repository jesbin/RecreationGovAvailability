#!/usr/bin/env node
/**
 * Downloads all campground facilities from the RIDB API and writes a compact
 * JSON file to public/campgrounds.json for use as a static map asset.
 *
 * Usage: RIDB_API_KEY=your_key node scripts/fetch-ridb-locations.js
 */

import fetch from 'node-fetch'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'public', 'campgrounds.json')

const API_KEY = process.env.RIDB_API_KEY
if (!API_KEY) {
  console.error('Error: RIDB_API_KEY environment variable is required.')
  console.error('Usage: RIDB_API_KEY=your_key node scripts/fetch-ridb-locations.js')
  process.exit(1)
}

const BASE = 'https://ridb.recreation.gov/api/v1'
const LIMIT = 50

async function fetchPage(offset) {
  const url = `${BASE}/facilities?limit=${LIMIT}&offset=${offset}&full=true`
  const res = await fetch(url, {
    headers: { apikey: API_KEY, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`RIDB API error ${res.status}: ${await res.text()}`)
  return res.json()
}

function getState(facility) {
  const addresses = facility.FACILITYADDRESS || []
  const addr = addresses.find((a) => a.AddressStateCode) || addresses[0]
  return addr?.AddressStateCode || ''
}

async function main() {
  console.log('Fetching RIDB facilities...')

  // Get total count first
  const first = await fetchPage(0)
  const total = first.METADATA?.RESULTS?.TOTAL_COUNT || 0
  console.log(`Total facilities: ${total}`)

  const allFacilities = [...first.RECDATA]

  // Fetch remaining pages
  const pages = Math.ceil(total / LIMIT)
  for (let page = 1; page < pages; page++) {
    const offset = page * LIMIT
    process.stdout.write(`\rFetching page ${page + 1}/${pages} (${offset}/${total})...`)
    const data = await fetchPage(offset)
    allFacilities.push(...data.RECDATA)
    // Be polite — small delay between requests
    await new Promise((r) => setTimeout(r, 100))
  }
  console.log('\nDone fetching.')

  // Filter to campgrounds with valid coordinates
  const campgrounds = allFacilities
    .filter((f) => {
      const type = (f.FacilityTypeDescription || '').toLowerCase()
      const lat = parseFloat(f.FacilityLatitude)
      const lng = parseFloat(f.FacilityLongitude)
      return (
        type.includes('campground') &&
        !isNaN(lat) && lat !== 0 &&
        !isNaN(lng) && lng !== 0
      )
    })
    .map((f) => ({
      id: String(f.FacilityID),
      name: f.FacilityName,
      lat: parseFloat(parseFloat(f.FacilityLatitude).toFixed(5)),
      lng: parseFloat(parseFloat(f.FacilityLongitude).toFixed(5)),
      state: getState(f),
    }))

  console.log(`Campgrounds with valid coordinates: ${campgrounds.length} / ${allFacilities.length}`)

  mkdirSync(join(__dirname, '..', 'public'), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(campgrounds))
  const kb = Math.round(Buffer.byteLength(JSON.stringify(campgrounds)) / 1024)
  console.log(`Written to ${OUT_PATH} (${kb} KB, ${campgrounds.length} campgrounds)`)
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
