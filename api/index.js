require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const helmet = require('helmet');
const db = require('../db'); // pg Pool
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const sharp = require('sharp');

const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Perbaikan untuk Express 5: Gunakan CORS tanpa rute '*' yang bermasalah
app.use(cors());

app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme_bsb',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // Wajib true di Vercel (HTTPS)
        sameSite: 'none', // Penting untuk cross-domain session
        maxAge: 2 * 60 * 60 * 1000
    }
}));

app.use(express.json());

// =====================================================
// MIDDLEWARE & HELPERS
// =====================================================
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    return res.status(401).json({ message: 'Akses ditolak.' });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const uploadToSupabase = async (file) => {
    if (!file) return null;
    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_KEY = (process.env.SUPABASE_KEY || '').trim();
    const BUCKET = 'beragam-sewa-bali-images';
    try {
        const optimizedBuffer = await sharp(file.buffer).resize(1200, null, { withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const uniqueFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: new URL(SUPABASE_URL).hostname,
                port: 443,
                path: `/storage/v1/object/${BUCKET}/${uniqueFilename}`,
                method: 'POST',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'image/webp', 'Content-Length': optimizedBuffer.length }
            }, (res) => {
                if (res.statusCode >= 400) return reject(new Error('Upload failed'));
                resolve(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uniqueFilename}`);
            });
            req.on('error', reject);
            req.write(optimizedBuffer);
            req.end();
        });
    } catch (e) { throw new Error('Processing failed'); }
};

const query = (sql, params) => db.query(sql, params).then(r => r.rows);
const queryOne = (sql, params) => db.query(sql, params).then(r => r.rows[0] || null);
const upsertContent = (k, v) => db.query(`INSERT INTO site_content (content_key, content_value) VALUES ($1, $2) ON CONFLICT (content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()`, [k, v]);

// =====================================================
// API ROUTES
// =====================================================
app.get('/api/admin/status', (req, res) => res.json({ loggedIn: !!(req.session && req.session.isAdmin) }));

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (password && password.trim() === (process.env.ADMIN_PASSWORD || 'admin123').trim()) {
        req.session.isAdmin = true;
        return res.json({ message: 'OK' });
    }
    res.status(401).json({ message: 'Wrong password' });
});

app.get('/api/content', async (req, res) => {
    try {
        const [c, i] = await Promise.all([query(`SELECT * FROM site_content`), query(`SELECT * FROM section_images ORDER BY id DESC`)]);
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
    try { res.json(await query(`SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC`)); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
    try { res.json(await queryOne(`SELECT * FROM section_images WHERE id=$1`, [req.params.id])); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/packages/:id', async (req, res) => {
    try { res.json(await queryOne(`SELECT * FROM section_images WHERE id=$1`, [req.params.id])); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
