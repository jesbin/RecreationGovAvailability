const express = require('express');
const fetch = require('node-fetch').default;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const REC_GOV_BASE = 'https://www.recreation.gov';

app.use(express.static(__dirname));

app.get('/api/search', async (req, res) => {
    const queryString = '?' + new URLSearchParams(req.query).toString();
    const targetUrl = `${REC_GOV_BASE}/api/search${queryString}`;
    try {
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/camps/*path', async (req, res) => {
    const subPath = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path;
    const queryString = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : '';
    const targetUrl = `${REC_GOV_BASE}/api/camps/${subPath}${queryString}`;
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
