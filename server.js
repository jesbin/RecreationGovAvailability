import express from 'express'
import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import nodemailer from 'nodemailer'
import cron from 'node-cron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())
const PORT = process.env.PORT || 3001

// ── Alert storage ──────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data')
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json')
const STATE_FILE = path.join(DATA_DIR, 'alert-state.json')

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readAlerts() {
    ensureDataDir()
    if (!existsSync(ALERTS_FILE)) return []
    try { return JSON.parse(readFileSync(ALERTS_FILE, 'utf8')) } catch { return [] }
}

function writeAlerts(alerts) {
    ensureDataDir()
    writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2))
}

function readState() {
    if (!existsSync(STATE_FILE)) return {}
    try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}

function writeState(state) {
    ensureDataDir()
    writeFileSync(STATE_FILE, JSON.stringify(state))
}

// ── Email ──────────────────────────────────────────────────────────────────────
function createTransport() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: parseInt(SMTP_PORT || '587') === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
}

async function sendAlertEmail(alert, newSites) {
    const transport = createTransport()
    if (!transport) {
        console.log(`[alerts] SMTP not configured — skipping email for ${alert.email}`)
        return
    }
    const siteList = newSites.map(s => `• Site ${s.site}: ${s.dates.map(d => new Date(d).toLocaleDateString()).join(', ')}`).join('\n')
    const monthNames = alert.months.map(m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]).join(', ')
    const bookingUrl = `https://www.recreation.gov/camping/campgrounds/${alert.campgroundId}`
    const unsubUrl = `${process.env.PUBLIC_URL || 'http://localhost:' + PORT}/api/alerts/${alert.id}/unsubscribe`

    await transport.sendMail({
        from: process.env.SMTP_FROM || `"CampFinder Alerts" <${process.env.SMTP_USER}>`,
        to: alert.email,
        subject: `🏕 New availability at ${alert.campgroundName}!`,
        text: [
            `Good news! New campsites just opened at ${alert.campgroundName} for ${monthNames} ${alert.year}.`,
            '',
            siteList,
            '',
            `Book now before they're gone: ${bookingUrl}`,
            '',
            `To cancel this alert: ${unsubUrl}`,
        ].join('\n'),
        html: `
            <p>Good news! New campsites just opened at <strong>${alert.campgroundName}</strong> for ${monthNames} ${alert.year}.</p>
            <ul>${newSites.map(s => `<li><strong>Site ${s.site}:</strong> ${s.dates.map(d => new Date(d).toLocaleDateString()).join(', ')}</li>`).join('')}</ul>
            <p><a href="${bookingUrl}" style="background:#111;color:white;padding:8px 18px;border-radius:20px;text-decoration:none;font-size:14px;">Book on Recreation.gov ↗</a></p>
            <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl}">Cancel this alert</a></p>
        `,
    })
    console.log(`[alerts] Sent email to ${alert.email} for ${alert.campgroundName}`)
}

// ── Availability check helpers ─────────────────────────────────────────────────
const MONTHS_MAP = { 1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',7:'July',8:'August',9:'September',10:'October',11:'November',12:'December' }

async function fetchAvailabilityForMonth(campgroundId, year, month) {
    const monthStr = String(month).padStart(2, '0')
    const url = `https://www.recreation.gov/api/camps/availability/campground/${campgroundId}/month?start_date=${year}-${monthStr}-01T00%3A00%3A00.000Z`
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } })
    return res.json()
}

async function getAvailableSitesForAlert(alert) {
    const { campgroundId, year, months, minConsecutive = 1 } = alert
    const results = await Promise.all(months.map(m => fetchAvailabilityForMonth(campgroundId, year, m)))
    const merged = {}
    results.forEach(r => {
        Object.entries(r.campsites || {}).forEach(([id, cs]) => {
            if (!merged[id]) merged[id] = { site: cs.site, availabilities: {} }
            Object.assign(merged[id].availabilities, cs.availabilities)
        })
    })
    const available = []
    Object.values(merged).forEach(cs => {
        const dates = Object.entries(cs.availabilities)
            .filter(([, s]) => s === 'Available')
            .map(([dt]) => dt)
            .sort()
        if (dates.length === 0) return
        let maxRun = 1, run = 1
        for (let i = 1; i < dates.length; i++) {
            const diff = (new Date(dates[i]) - new Date(dates[i-1])) / 86400000
            run = Math.round(diff) === 1 ? run + 1 : 1
            maxRun = Math.max(maxRun, run)
        }
        if (maxRun >= minConsecutive) available.push({ site: cs.site, dates })
    })
    return available
}

// ── Cron: check alerts every 30 minutes ──────────────────────────────────────
cron.schedule('*/30 * * * *', async () => {
    const alerts = readAlerts().filter(a => a.active)
    if (alerts.length === 0) return
    console.log(`[alerts] Checking ${alerts.length} active alert(s)...`)
    const state = readState()

    for (const alert of alerts) {
        try {
            const current = await getAvailableSitesForAlert(alert)
            const prevSiteIds = new Set(state[alert.id] || [])
            const newSites = current.filter(s => !prevSiteIds.has(s.site))

            if (newSites.length > 0) {
                console.log(`[alerts] ${newSites.length} new site(s) for alert ${alert.id} (${alert.campgroundName})`)
                await sendAlertEmail(alert, newSites)
            }
            state[alert.id] = current.map(s => s.site)
        } catch (err) {
            console.error(`[alerts] Error checking alert ${alert.id}:`, err.message)
        }
    }
    writeState(state)
})

const REC_GOV_BASE = 'https://www.recreation.gov'

// Serve built React app
app.use(express.static(path.join(__dirname, 'dist')))

// Also serve public/ folder (campgrounds.json static asset) during dev
app.use(express.static(path.join(__dirname, 'public')))

app.get('/api/ridb/*path', async (req, res) => {
    const subPath = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path
    const queryString = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : ''
    const targetUrl = `https://ridb.recreation.gov/api/v1/${subPath}${queryString}`
    const apiKey = process.env.RIDB_API_KEY
    if (!apiKey) {
        res.status(503).json({ error: 'RIDB_API_KEY not configured' })
        return
    }
    try {
        const response = await fetch(targetUrl, {
            headers: { 'apikey': apiKey, 'Accept': 'application/json' }
        })
        const data = await response.json()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.get('/api/search', async (req, res) => {
    const queryString = '?' + new URLSearchParams(req.query).toString()
    const targetUrl = `${REC_GOV_BASE}/api/search${queryString}`
    try {
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        })
        const data = await response.json()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.get('/api/camps/*path', async (req, res) => {
    const subPath = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path
    const queryString = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : ''
    const targetUrl = `${REC_GOV_BASE}/api/camps/${subPath}${queryString}`
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        })
        const data = await response.json()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ── Alert routes ───────────────────────────────────────────────────────────────
app.post('/api/alerts', (req, res) => {
    const { email, campgroundId, campgroundName, year, months, minConsecutive } = req.body
    if (!email || !campgroundId || !months?.length || !year) {
        return res.status(400).json({ error: 'Missing required fields' })
    }
    const alerts = readAlerts()
    const existing = alerts.find(a => a.email === email && a.campgroundId === campgroundId && a.active)
    if (existing) return res.status(200).json({ id: existing.id, message: 'Alert already exists' })

    const alert = {
        id: randomUUID(),
        email, campgroundId, campgroundName,
        year: parseInt(year), months, minConsecutive: parseInt(minConsecutive) || 1,
        active: true, createdAt: new Date().toISOString(),
    }
    alerts.push(alert)
    writeAlerts(alerts)
    console.log(`[alerts] Created alert ${alert.id} for ${email} → ${campgroundName}`)
    res.status(201).json({ id: alert.id })
})

app.delete('/api/alerts/:id', (req, res) => {
    const alerts = readAlerts()
    const idx = alerts.findIndex(a => a.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Alert not found' })
    alerts[idx].active = false
    writeAlerts(alerts)
    res.json({ ok: true })
})

app.get('/api/alerts/:id/unsubscribe', (req, res) => {
    const alerts = readAlerts()
    const idx = alerts.findIndex(a => a.id === req.params.id)
    if (idx !== -1) { alerts[idx].active = false; writeAlerts(alerts) }
    res.send('<html><body style="font-family:sans-serif;padding:40px;"><h2>✅ Unsubscribed</h2><p>You\'ve been removed from this alert.</p></body></html>')
})

// SPA fallback — all non-API routes serve index.html
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
})
