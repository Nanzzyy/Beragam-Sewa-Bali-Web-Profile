require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const db = require('../db');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// ─── Safe upsert untuk site_content ─────────────────────────────────────────
// Bekerja dengan atau tanpa UNIQUE constraint di content_key
async function upsertContent(key, value) {
    const upd = await db.query(
        'UPDATE site_content SET content_value=$1 WHERE content_key=$2',
        [value, key]
    );
    if (upd.rowCount === 0) {
        await db.query(
            'INSERT INTO site_content(content_key, content_value) VALUES($1, $2)',
            [key, value]
        );
    }
}

// Supabase client untuk image storage
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(cookieParser(process.env.SESSION_SECRET || 'bsb_secret_key'));
app.use(express.json());

// Serve static files (HTML, CSS, JS, gambar) — hanya efektif saat local dev
app.use(express.static(path.join(__dirname, '..')));

// ─── Helper: Upload gambar ke Supabase Storage ───────────────────────────────
// Menerima Buffer atau base64, mengembalikan public URL
async function uploadToSupabase(fileBuffer, mimetype, folder = 'uploads') {
    const ext = mimetype.split('/')[1] || 'jpg';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
        .from('images')
        .upload(filename, fileBuffer, { contentType: mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('images').getPublicUrl(filename);
    return data.publicUrl;
}

// ─── Helper: Parse multipart/form-data tanpa multer (native) ─────────────────
function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks);
            const boundary = req.headers['content-type']?.split('boundary=')[1];
            if (!boundary) return resolve({ fields: {}, files: [] });

            const parts = body.toString('binary').split(`--${boundary}`);
            const fields = {};
            const files = [];

            parts.forEach(part => {
                if (!part || part === '--\r\n' || part.trim() === '--') return;
                const [headerStr, ...bodyParts] = part.split('\r\n\r\n');
                const bodyStr = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
                const nameMatch = headerStr.match(/name="([^"]+)"/);
                const filenameMatch = headerStr.match(/filename="([^"]+)"/);
                const contentTypeMatch = headerStr.match(/Content-Type: ([^\r\n]+)/i);

                if (!nameMatch) return;
                const name = nameMatch[1];
                if (filenameMatch) {
                    files.push({
                        fieldname: name,
                        originalname: filenameMatch[1],
                        mimetype: contentTypeMatch?.[1]?.trim() || 'application/octet-stream',
                        buffer: Buffer.from(bodyStr, 'binary')
                    });
                } else {
                    fields[name] = bodyStr;
                }
            });
            resolve({ fields, files });
        });
        req.on('error', reject);
    });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
    if (req.signedCookies.isAdmin === 'true') return next();
    res.status(401).json({ message: 'Unauthorized' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// GET /api/admin/status
app.get('/api/admin/status', (req, res) => {
    const isAdmin = req.signedCookies.isAdmin === 'true';
    res.json({ loggedIn: isAdmin });
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
        res.cookie('isAdmin', 'true', {
            httpOnly: true,
            secure: isProduction,
            signed: true,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 3600000
        });
        return res.json({ message: 'OK' });
    }
    res.status(401).json({ message: 'Error' });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('isAdmin');
    res.json({ message: 'Logged out' });
});

// GET /api/content — data gabungan untuk halaman utama
app.get('/api/content', async (req, res) => {
    try {
        // ORDER BY id DESC agar nilai terbaru selalu menang jika ada duplikat
        const texts = await db.query('SELECT DISTINCT ON (content_key) * FROM site_content ORDER BY content_key, id DESC');
        const images = await db.query('SELECT * FROM section_images ORDER BY id DESC');

        const siteContent = texts.rows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const groupedImages = images.rows.reduce((acc, img) => {
            let key = img.section_key;
            if (key === 'service' || key === 'package') key = `${key}s`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(key.endsWith('s')
                ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text }
                : img);
            return acc;
        }, {});

        res.json({ ...siteContent, ...groupedImages });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/gallery
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC");
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS — data per-section untuk admin panel
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/hero
app.get('/api/hero', requireAdmin, async (req, res) => {
    try {
        const texts = await db.query("SELECT content_key, content_value FROM site_content WHERE content_key IN ('home_title','home_subtitle')");
        const images = await db.query("SELECT * FROM section_images WHERE section_key='home_slider' ORDER BY id DESC");
        const data = texts.rows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        res.json({ title: data.home_title || '', subtitle: data.home_subtitle || '', images: images.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/hero/text
app.post('/api/hero/text', requireAdmin, async (req, res) => {
    try {
        const { title, subtitle } = req.body;
        await upsertContent('home_title', title);
        await upsertContent('home_subtitle', subtitle);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/hero/image (upload slide)
app.post('/api/hero/image', requireAdmin, async (req, res) => {
    try {
        const { files } = await parseMultipart(req);
        const file = files.find(f => f.fieldname === 'image');
        if (!file) return res.status(400).json({ error: 'No image' });
        const url = await uploadToSupabase(file.buffer, file.mimetype, 'hero');
        await db.query("INSERT INTO section_images(section_key, image_url) VALUES('home_slider', $1)", [url]);
        res.json({ message: 'Uploaded', url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/hero/image/:id
app.delete('/api/hero/image/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM section_images WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/about
app.get('/api/about', requireAdmin, async (req, res) => {
    try {
        const texts = await db.query("SELECT content_key, content_value FROM site_content WHERE content_key IN ('about_title','about_text')");
        const images = await db.query("SELECT * FROM section_images WHERE section_key='about_carousel' ORDER BY id DESC");
        const data = texts.rows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        res.json({ title: data.about_title || '', text: data.about_text || '', images: images.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/about/text
app.post('/api/about/text', requireAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;
        await upsertContent('about_title', title);
        await upsertContent('about_text', text);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/about/image
app.post('/api/about/image', requireAdmin, async (req, res) => {
    try {
        const { files } = await parseMultipart(req);
        const file = files.find(f => f.fieldname === 'image');
        if (!file) return res.status(400).json({ error: 'No image' });
        const url = await uploadToSupabase(file.buffer, file.mimetype, 'about');
        await db.query("INSERT INTO section_images(section_key, image_url) VALUES('about_carousel', $1)", [url]);
        res.json({ message: 'Uploaded', url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/about/image/:id
app.delete('/api/about/image/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM section_images WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/services
app.get('/api/services', requireAdmin, async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM section_images WHERE section_key='service' ORDER BY id DESC");
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/services/:id
app.get('/api/services/:id', requireAdmin, async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM section_images WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
        const row = r.rows[0];
        res.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/services (create)
app.post('/api/services', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'services');
        await db.query(
            "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('service',$1,$2,$3,$4)",
            [fields.title, fields.text, fields.long_text, url]
        );
        res.json({ message: 'Created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/services/:id (update)
app.put('/api/services/:id', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'services');
        const query = url
            ? 'UPDATE section_images SET title=$1,text=$2,long_text=$3,image_url=$4 WHERE id=$5'
            : 'UPDATE section_images SET title=$1,text=$2,long_text=$3 WHERE id=$4';
        const params = url ? [fields.title, fields.text, fields.long_text, url, req.params.id] : [fields.title, fields.text, fields.long_text, req.params.id];
        await db.query(query, params);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/services/:id
app.delete('/api/services/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM section_images WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/packages
app.get('/api/packages', requireAdmin, async (req, res) => {
    try {
        const r = await db.query("SELECT * FROM section_images WHERE section_key='package' ORDER BY id DESC");
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/packages/:id
app.get('/api/packages/:id', requireAdmin, async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM section_images WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
        const row = r.rows[0];
        res.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/packages
app.post('/api/packages', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'packages');
        await db.query(
            "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('package',$1,$2,$3,$4)",
            [fields.title, fields.text, fields.long_text, url]
        );
        res.json({ message: 'Created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/packages/:id
app.put('/api/packages/:id', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'packages');
        const query = url
            ? 'UPDATE section_images SET title=$1,text=$2,long_text=$3,image_url=$4 WHERE id=$5'
            : 'UPDATE section_images SET title=$1,text=$2,long_text=$3 WHERE id=$4';
        const params = url ? [fields.title, fields.text, fields.long_text, url, req.params.id] : [fields.title, fields.text, fields.long_text, req.params.id];
        await db.query(query, params);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/packages/:id
app.delete('/api/packages/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM section_images WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/gallery (bulk upload)
app.post('/api/gallery', requireAdmin, async (req, res) => {
    try {
        const { files } = await parseMultipart(req);
        const imageFiles = files.filter(f => f.fieldname === 'images');
        if (!imageFiles.length) return res.status(400).json({ error: 'No images' });
        for (const file of imageFiles) {
            const url = await uploadToSupabase(file.buffer, file.mimetype, 'gallery');
            await db.query("INSERT INTO section_images(section_key, image_url) VALUES('gallery', $1)", [url]);
        }
        res.json({ message: 'Uploaded' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/gallery/:id
app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM section_images WHERE id=$1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/site/logo
app.post('/api/site/logo', requireAdmin, async (req, res) => {
    try {
        const { files } = await parseMultipart(req);
        const file = files.find(f => f.fieldname === 'image');
        if (!file) return res.status(400).json({ error: 'No image' });
        const url = await uploadToSupabase(file.buffer, file.mimetype, 'logos');
        await upsertContent('site_logo', url);
        res.json({ message: 'Updated', url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vercel export
module.exports = app;

// Local dev server
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    });
}
