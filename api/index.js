require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const helmet = require('helmet');
const db = require('../db');
const crypto = require('crypto');
const https = require('https');
const sharp = require('sharp');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors()); // CORS Standar (Express 5 safe)

app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme_bsb',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: true, sameSite: 'none', maxAge: 2 * 60 * 60 * 1000 }
}));

app.use(express.json());

// =====================================================
// API ROUTES (Hanya untuk /api)
// =====================================================

app.get('/api/admin/status', (req, res) => res.json({ loggedIn: !!(req.session && req.session.isAdmin) }));

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (password && password.trim() === (process.env.ADMIN_PASSWORD || 'admin123').trim()) {
        req.session.isAdmin = true;
        return res.json({ message: 'OK' });
    }
    res.status(401).json({ message: 'Password salah' });
});

app.get('/api/content', async (req, res) => {
    try {
        const [c, i] = await Promise.all([
            db.query(`SELECT * FROM site_content`).then(r => r.rows),
            db.query(`SELECT * FROM section_images ORDER BY id DESC`).then(r => r.rows)
        ]);
        const siteContent = c.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const grouped = i.reduce((a, img) => {
            let k = img.section_key; if (k === 'service' || k === 'package') k += 's';
            if (!a[k]) a[k] = [];
            a[k].push(k.endsWith('s') ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text, long_text: img.long_text } : img);
            return a;
        }, {});
        res.json({ ...siteContent, ...grouped });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/gallery', async (req, res) => {
    try {
        const rows = await db.query(`SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC`).then(r => r.rows);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
    try {
        const row = await db.query(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]).then(r => r.rows[0]);
        res.json(row || {});
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/packages/:id', async (req, res) => {
    try {
        const row = await db.query(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]).then(r => r.rows[0]);
        res.json(row || {});
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Middleware fallback 404 untuk rute /api yang salah
app.use('/api', (req, res) => res.status(404).json({ message: 'API Route Not Found' }));

module.exports = app;
