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
const port = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS Sederhana & Stabil untuk Express 5
app.use(cors());

app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme_bsb',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 2 * 60 * 60 * 1000
    }
}));

app.use(express.json());

// =====================================================
// MIDDLEWARE AUTENTIKASI ADMIN
// =====================================================
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    return res.status(401).json({ message: 'Akses ditolak. Silakan login terlebih dahulu.' });
}

// =====================================================
// KONFIGURASI MULTER (Upload File)
// =====================================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// =====================================================
// HELPER: Upload ke Supabase Storage
// =====================================================
const uploadToSupabase = async (file) => {
    if (!file) return null;
    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_KEY = (process.env.SUPABASE_KEY || '').trim();
    const BUCKET = 'beragam-sewa-bali-images';

    try {
        const optimizedBuffer = await sharp(file.buffer)
            .resize(1200, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}.webp`;
        const urlPath = `/storage/v1/object/${BUCKET}/${uniqueFilename}`;

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: new URL(SUPABASE_URL).hostname,
                port: 443,
                path: urlPath,
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'image/webp',
                    'Content-Length': optimizedBuffer.length
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode >= 400) return reject(new Error(`Gagal upload: ${data}`));
                    resolve(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uniqueFilename}`);
                });
            });
            req.on('error', reject);
            req.write(optimizedBuffer);
            req.end();
        });
    } catch (error) { throw new Error('Gagal memproses gambar'); }
};

// =====================================================
// API ENDPOINTS
// =====================================
const query = (sql, params) => db.query(sql, params).then(r => r.rows);
const queryOne = (sql, params) => db.query(sql, params).then(r => r.rows[0] || null);
const upsertContent = (key, value) => db.query(`INSERT INTO site_content (content_key, content_value) VALUES ($1, $2) ON CONFLICT (content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()`, [key, value]);

app.get('/api/admin/status', (req, res) => res.json({ loggedIn: !!(req.session && req.session.isAdmin) }));

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const truePassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();
    if (password && password.trim() === truePassword) {
        req.session.isAdmin = true;
        return res.json({ message: 'Login berhasil.' });
    }
    res.status(401).json({ message: 'Password salah.' });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout berhasil.' });
    });
});

app.get('/api/content', async (req, res) => {
    try {
        const [contentRows, imageRows] = await Promise.all([
            query(`SELECT content_key, content_value FROM site_content`),
            query(`SELECT * FROM section_images ORDER BY section_key, sort_order ASC, id DESC`)
        ]);
        const siteContent = contentRows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const groupedImages = imageRows.reduce((acc, img) => {
            let key = img.section_key;
            if (key === 'service' || key === 'package') key = `${key}s`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(key.endsWith('s') ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text, long_text: img.long_text, caption: img.caption } : img);
            return acc;
        }, {});
        res.json({ ...siteContent, ...groupedImages });
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

// Admin Protected
app.post('/api/hero/text', requireAdmin, async (req, res) => {
    try { await upsertContent('home_title', req.body.title); await upsertContent('home_subtitle', req.body.subtitle); res.json({ message: 'OK' }); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/about/text', requireAdmin, async (req, res) => {
    try { await upsertContent('about_title', req.body.title); await upsertContent('about_text', req.body.text); res.json({ message: 'OK' }); }
    catch (e) { res.status(500).json({ message: e.message }); }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`✅ Server berjalan di http://localhost:${port}`));
}

module.exports = app;
