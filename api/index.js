require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const db = require('../db');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(cookieParser(process.env.SESSION_SECRET || 'bsb_secret_key'));
app.use(express.json());

// --- API Endpoints ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/admin/status', (req, res) => {
    const isAdmin = req.signedCookies.isAdmin === 'true';
    res.json({ loggedIn: isAdmin });
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
        res.cookie('isAdmin', 'true', {
            httpOnly: true,
            secure: true,
            signed: true,
            sameSite: 'none',
            maxAge: 3600000
        });
        return res.json({ message: 'OK' });
    }
    res.status(401).json({ message: 'Error' });
});

app.get('/api/content', async (req, res) => {
    try {
        const texts = await db.query('SELECT * FROM site_content');
        const images = await db.query('SELECT * FROM section_images ORDER BY id DESC');

        const siteContent = texts.rows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const groupedImages = images.rows.reduce((acc, img) => {
            let key = img.section_key;
            if (key === 'service' || key === 'package') key = `${key}s`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(key.endsWith('s') ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text } : img);
            return acc;
        }, {});

        res.json({ ...siteContent, ...groupedImages });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gallery', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vercel export
module.exports = app;
