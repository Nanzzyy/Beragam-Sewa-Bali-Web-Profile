require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const db = require('../db');
const crypto = require('crypto');
const sharp = require('sharp');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(cookieParser(process.env.SESSION_SECRET || 'changeme_bsb'));
app.use(express.json());

// =====================================================
// MIDDLEWARE & HELPERS
// =====================================================
function requireAdmin(req, res, next) {
    const isAdmin = req.signedCookies.isAdmin === 'true';
    if (isAdmin) return next();
    return res.status(401).json({ message: 'Unauthorized' });
}

// =====================================================
// API ROUTES
// =====================================================

app.get('/api/admin/status', (req, res) => {
    const isAdmin = req.signedCookies.isAdmin === 'true';
    res.json({ loggedIn: isAdmin });
});

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const truePassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();
    if (password && password.trim() === truePassword) {
        // Simpan login di Cookie (Serverless compatible)
        res.cookie('isAdmin', 'true', {
            httpOnly: true,
            secure: true,
            signed: true,
            sameSite: 'none',
            maxAge: 2 * 60 * 60 * 1000
        });
        return res.json({ message: 'OK' });
    }
    res.status(401).json({ message: 'Wrong password' });
});

app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('isAdmin');
    res.json({ message: 'OK' });
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
    try { res.json(await db.query(`SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC`).then(r => r.rows)); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
    try { res.json(await db.query(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]).then(r => r.rows[0]) || {}); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/packages/:id', async (req, res) => {
    try { res.json(await db.query(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]).then(r => r.rows[0]) || {}); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = app;
