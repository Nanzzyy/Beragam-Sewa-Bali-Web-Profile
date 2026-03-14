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

const app = express();
const port = process.env.PORT || 3000;

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors()); // Mengizinkan semua akses tanpa syarat untuk menghindari error CORS di produksi
app.options('*', cors()); // Mendukung pre-flight requests untuk semua rute

app.use(session({
    secret: process.env.SESSION_SECRET || 'changeme_set_in_dotenv',
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
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 5;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Format file tidak diizinkan. Gunakan: JPG, PNG, WebP, atau GIF.`));
        }
    }
});

// =====================================================
// HELPER: Upload ke Supabase Storage via REST API
// =====================================================
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (process.env.SUPABASE_KEY || '').trim();
const BUCKET = 'beragam-sewa-bali-images';

const sharp = require('sharp');

// ... (existing code up to uploadToSupabase)

const uploadToSupabase = async (file) => {
    if (!file) return null;
    
    try {
        // OPTIMIZATION: Compress and convert to WebP using sharp
        const optimizedBuffer = await sharp(file.buffer)
            .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
            .webp({ quality: 80 }) // Convert to WebP with 80% quality
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
                    'Content-Length': optimizedBuffer.length,
                    'x-upsert': 'false'
                }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        return reject(new Error(`Gagal upload: ${data}`));
                    }
                    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uniqueFilename}`;
                    resolve(publicUrl);
                });
            });
            req.on('error', reject);
            req.setTimeout(30000, () => { req.destroy(); reject(new Error('Upload timeout')); });
            req.write(optimizedBuffer);
            req.end();
        });
    } catch (error) {
        console.error('Sharp processing error:', error);
        throw new Error('Gagal memproses gambar');
    }
};

const deleteFile = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('supabase.co')) return;
    try {
        const urlObj = new URL(imageUrl);
        const pathSegments = urlObj.pathname.split('/');
        const filename = pathSegments[pathSegments.length - 1];

        return new Promise((resolve) => {
            const body = JSON.stringify({ prefixes: [filename] });
            const req = https.request({
                hostname: new URL(SUPABASE_URL).hostname,
                port: 443,
                path: `/storage/v1/object/${BUCKET}`,
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => { res.resume(); res.on('end', resolve); });
            req.on('error', () => resolve());
            req.write(body);
            req.end();
        });
    } catch (e) {
        console.warn('Gagal hapus file:', e.message);
    }
};

// =====================================================
// HELPER: SQL shorthand
// =====================================================
const query = (sql, params) => db.query(sql, params).then(r => r.rows);
const queryOne = (sql, params) => db.query(sql, params).then(r => r.rows[0] || null);

// =====================================================
// ADMIN AUTH ROUTES
// =====================================================

app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password diperlukan.' });
    const truePassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();
    if (password.trim() !== truePassword) {
        return res.status(401).json({ message: 'Password salah.' });
    }
    req.session.isAdmin = true;
    req.session.loginTime = Date.now();
    res.json({ message: 'Login berhasil.' });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: 'Gagal logout.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout berhasil.' });
    });
});

app.get('/api/admin/status', (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

// =====================================================
// PUBLIC API ENDPOINTS
// =====================================================

// Helper upsert site_content
const upsertContent = (key, value) =>
    db.query(
        `INSERT INTO site_content (content_key, content_value) VALUES ($1, $2)
         ON CONFLICT (content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()`,
        [key, value]
    );

// [GET] Hero
app.get('/api/hero', async (req, res) => {
    try {
        const [texts, images] = await Promise.all([
            query(`SELECT content_key, content_value FROM site_content WHERE content_key IN ('home_title','home_subtitle')`),
            query(`SELECT * FROM section_images WHERE section_key='home_slider' ORDER BY sort_order ASC, id DESC`)
        ]);
        const t = texts.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        res.json({ title: t.home_title || '', subtitle: t.home_subtitle || '', images });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// [GET] About
app.get('/api/about', async (req, res) => {
    try {
        const [texts, images] = await Promise.all([
            query(`SELECT content_key, content_value FROM site_content WHERE content_key IN ('about_title','about_text')`),
            query(`SELECT * FROM section_images WHERE section_key='about_carousel' ORDER BY sort_order ASC, id DESC`)
        ]);
        const t = texts.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        res.json({ title: t.about_title || '', text: t.about_text || '', images });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// [GET] Services
app.get('/api/services', async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM section_images WHERE section_key='service' ORDER BY id DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
    try {
        const row = await queryOne(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]);
        if (!row) return res.status(404).json({ message: 'Item not found' });
        res.json(row);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// [GET] Packages
app.get('/api/packages', async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM section_images WHERE section_key='package' ORDER BY id DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/packages/:id', async (req, res) => {
    try {
        const row = await queryOne(`SELECT * FROM section_images WHERE id=$1`, [req.params.id]);
        if (!row) return res.status(404).json({ message: 'Item not found' });
        res.json(row);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// [GET] Gallery
app.get('/api/gallery', async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC`);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// [GET] Content (all-in-one untuk frontend)
app.get('/api/content', async (req, res) => {
    try {
        // Run both queries concurrently
        const [contentRows, imageRows] = await Promise.all([
            query(`SELECT content_key, content_value FROM site_content`),
            query(`SELECT * FROM section_images ORDER BY section_key, sort_order ASC, id DESC`)
        ]);
        
        const siteContent = contentRows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const groupedImages = imageRows.reduce((acc, img) => {
            let key = img.section_key;
            if (key === 'service' || key === 'package') key = `${key}s`;
            if (!acc[key]) acc[key] = [];
            if (key === 'services' || key === 'packages') {
                acc[key].push({ id: img.id, image_url: img.image_url, name: img.title, description: img.text, long_text: img.long_text, caption: img.caption, sort_order: img.sort_order });
            } else {
                acc[key].push(img);
            }
            return acc;
        }, {});
        
        res.json({ ...siteContent, ...groupedImages, site_logo: siteContent.site_logo || null });
    } catch (e) {
        console.error('/api/content error:', e);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil konten.' });
    }
});

// =====================================================
// PROTECTED ADMIN API
// =====================================================

// -- Hero --
app.post('/api/hero/text', requireAdmin, async (req, res) => {
    console.log('>>> [START /api/hero/text] Body:', req.body);
    const { title, subtitle } = req.body;
    try {
        console.log('>>> [1] Calling upsertContent home_title');
        await upsertContent('home_title', title);
        console.log('>>> [2] Calling upsertContent home_subtitle');
        await upsertContent('home_subtitle', subtitle);
        console.log('>>> [3] Finishing /api/hero/text');
        res.json({ message: 'Hero text updated successfully' });
    } catch (e) {
        console.error('>>> [FAIL] [/api/hero/text]', e.message, 'FULL ERR:', e);
        res.status(500).json({ message: e.message });
    }
});

app.post('/api/hero/image', requireAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file found' });
    try {
        const image_url = await uploadToSupabase(req.file);
        await db.query(`INSERT INTO section_images (section_key, image_url) VALUES ('home_slider', $1)`, [image_url]);
        res.status(201).json({ message: 'Hero image uploaded', image_url });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/hero/image/:id', requireAdmin, async (req, res) => {
    try {
        const row = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (row) {
            await deleteFile(row.image_url);
            await db.query(`DELETE FROM section_images WHERE id=$1`, [req.params.id]);
        }
        res.json({ message: 'Image deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- About --
app.post('/api/about/text', requireAdmin, async (req, res) => {
    const { title, text } = req.body;
    try {
        await upsertContent('about_title', title);
        await upsertContent('about_text', text);
        res.json({ message: 'About text updated successfully' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/about/image', requireAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file found' });
    try {
        const image_url = await uploadToSupabase(req.file);
        await db.query(`INSERT INTO section_images (section_key, image_url) VALUES ('about_carousel', $1)`, [image_url]);
        res.status(201).json({ message: 'About image uploaded', image_url });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/about/image/:id', requireAdmin, async (req, res) => {
    try {
        const row = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (row) {
            await deleteFile(row.image_url);
            await db.query(`DELETE FROM section_images WHERE id=$1`, [req.params.id]);
        }
        res.json({ message: 'Image deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Services --
app.post('/api/services', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, text, long_text } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    try {
        const image_url = await uploadToSupabase(req.file);
        await db.query(`INSERT INTO section_images (section_key, image_url, title, text, long_text) VALUES ('service', $1, $2, $3, $4)`, [image_url, title, text, long_text || null]);
        res.status(201).json({ message: 'Service created' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/services/:id', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, text, long_text } = req.body;
    try {
        const existing = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (!existing) return res.status(404).json({ message: 'Not found' });
        let image_url = existing.image_url;
        if (req.file) { await deleteFile(image_url); image_url = await uploadToSupabase(req.file); }
        await db.query(`UPDATE section_images SET title=$1, text=$2, long_text=$3, image_url=$4 WHERE id=$5`, [title, text, long_text || null, image_url, req.params.id]);
        res.json({ message: 'Service updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/services/:id', requireAdmin, async (req, res) => {
    try {
        const row = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (row) { await deleteFile(row.image_url); await db.query(`DELETE FROM section_images WHERE id=$1`, [req.params.id]); }
        res.json({ message: 'Service deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Packages --
app.post('/api/packages', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, text, long_text } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    try {
        const image_url = await uploadToSupabase(req.file);
        await db.query(`INSERT INTO section_images (section_key, image_url, title, text, long_text) VALUES ('package', $1, $2, $3, $4)`, [image_url, title, text, long_text || null]);
        res.status(201).json({ message: 'Package created' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/packages/:id', requireAdmin, upload.single('image'), async (req, res) => {
    const { title, text, long_text } = req.body;
    try {
        const existing = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (!existing) return res.status(404).json({ message: 'Not found' });
        let image_url = existing.image_url;
        if (req.file) { await deleteFile(image_url); image_url = await uploadToSupabase(req.file); }
        await db.query(`UPDATE section_images SET title=$1, text=$2, long_text=$3, image_url=$4 WHERE id=$5`, [title, text, long_text || null, image_url, req.params.id]);
        res.json({ message: 'Package updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/packages/:id', requireAdmin, async (req, res) => {
    try {
        const row = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (row) { await deleteFile(row.image_url); await db.query(`DELETE FROM section_images WHERE id=$1`, [req.params.id]); }
        res.json({ message: 'Package deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Gallery --
app.post('/api/gallery', requireAdmin, upload.array('images', 12), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Images required' });
    try {
        for (const file of req.files) {
            const image_url = await uploadToSupabase(file);
            await db.query(`INSERT INTO section_images (section_key, image_url) VALUES ('gallery', $1)`, [image_url]);
        }
        res.status(201).json({ message: 'Gallery images uploaded' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
        const row = await queryOne(`SELECT image_url FROM section_images WHERE id=$1`, [req.params.id]);
        if (row) { await deleteFile(row.image_url); await db.query(`DELETE FROM section_images WHERE id=$1`, [req.params.id]); }
        res.json({ message: 'Gallery image deleted' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Content text update --
app.post('/api/content', requireAdmin, async (req, res) => {
    const changes = req.body;
    try {
        for (const key of Object.keys(changes)) {
            await upsertContent(key, changes[key]);
        }
        res.json({ message: 'Konten berhasil diperbarui' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Logo Management --
app.post('/api/site/logo', requireAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Logo required' });
    try {
        const image_url = await uploadToSupabase(req.file);
        await upsertContent('site_logo', image_url);
        res.status(200).json({ message: 'Logo updated', image_url });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// -- Upload gambar lama --
app.post('/api/upload/image', requireAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    const { section_key, caption } = req.body;
    try {
        const image_url = await uploadToSupabase(req.file);
        await db.query(`INSERT INTO section_images (section_key, image_url, caption) VALUES ($1, $2, $3)`, [section_key, image_url, caption || null]);
        res.status(201).json({ message: 'Gambar berhasil diupload', image_url });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// =====================================================
// ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `Ukuran file melebihi batas ${MAX_FILE_SIZE_MB}MB.` });
    }
    if (err.message && err.message.startsWith('Format file')) {
        return res.status(400).json({ message: err.message });
    }
    console.error('Server error:', err);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`✅ Server berjalan di http://localhost:${port}`));
}

module.exports = app;