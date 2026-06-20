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

// Simple In-Memory Cache for lightning fast local performance
const memoryCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

async function getCached(key, fetcher) {
    if (memoryCache.has(key)) {
        const cached = memoryCache.get(key);
        if (Date.now() - cached.time < CACHE_TTL) return cached.data;
    }
    const data = await fetcher();
    memoryCache.set(key, { data, time: Date.now() });
    return data;
}

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
    process.env.SUPABASE_URL || process.env.API_EXTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_KEY || process.env.SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
        .from('beragam-sewa-bali-images')
        .upload(filename, fileBuffer, { contentType: mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('beragam-sewa-bali-images').getPublicUrl(filename);
    return data.publicUrl;
}

// ─── Helper: Parse multipart/form-data tanpa multer (native) ─────────────────
function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks);
            const contentType = req.headers['content-type'];
            const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/);
            const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
            if (!boundary) return resolve({ fields: {}, files: [] });

            const boundaryBuffer = Buffer.from(`--${boundary}`);
            const parts = [];
            let start = 0;

            while (true) {
                const boundaryIndex = body.indexOf(boundaryBuffer, start);
                if (boundaryIndex === -1) break;
                
                // End of this part is where the next boundary starts
                const nextBoundaryIndex = body.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
                if (nextBoundaryIndex === -1) break;

                // The part content is between boundaries
                // It usually starts with \r\n and ends with \r\n
                const part = body.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
                parts.push(part);
                start = nextBoundaryIndex;
            }

            const fields = {};
            const files = [];

            parts.forEach(part => {
                const headerEndIndex = part.indexOf('\r\n\r\n');
                if (headerEndIndex === -1) return;

                const headerStr = part.slice(0, headerEndIndex).toString();
                // The body starts after \r\n\r\n and ends before the \r\n that precedes the next boundary
                // But since we sliced 'part' between boundaries, the \r\n before the NEXT boundary is at the end of 'part'
                let bodyBuffer = part.slice(headerEndIndex + 4);
                if (bodyBuffer.slice(-2).toString() === '\r\n') {
                    bodyBuffer = bodyBuffer.slice(0, -2);
                }

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
                        buffer: bodyBuffer
                    });
                } else {
                    fields[name] = bodyBuffer.toString().trim();
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
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        res.cookie('isAdmin', 'true', {
            httpOnly: true,
            secure: isProduction,
            signed: true,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 3600000
        });
        return res.json({ message: 'OK' });
    } catch (err) {
        res.status(401).json({ message: err.message || 'Error' });
    }
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('isAdmin');
    res.json({ message: 'Logged out' });
});

// GET /api/content — data gabungan untuk halaman utama
app.get('/api/content', async (req, res) => {
    try {
        const { texts, images } = await getCached('content', async () => {
            const t = await db.query('SELECT DISTINCT ON (content_key) * FROM site_content ORDER BY content_key, id DESC');
            const i = await db.query('SELECT * FROM section_images ORDER BY id DESC');
            return { texts: t, images: i };
        });

        const siteContent = texts.rows.reduce((a, r) => ({ ...a, [r.content_key]: r.content_value }), {});
        const groupedImages = images.rows.reduce((acc, img) => {
            let key = img.section_key;
            if (key === 'catalog_service' || key === 'catalog_package') return acc;
            if (key === 'service' || key === 'package') key = `${key}s`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(key.endsWith('s')
                ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text }
                : img);
            return acc;
        }, {});

        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.json({ ...siteContent, ...groupedImages });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/gallery
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await getCached('gallery', () => db.query("SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC"));
        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/site-logo.png
app.get('/api/site-logo.png', async (req, res) => {
    try {
        const result = await db.query("SELECT content_value FROM site_content WHERE content_key = 'site_logo' LIMIT 1");
        if (result.rows.length > 0 && result.rows[0].content_value) {
            const logoUrl = result.rows[0].content_value;
            const imgRes = await fetch(logoUrl);
            if (imgRes.ok) {
                res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                const arrayBuffer = await imgRes.arrayBuffer();
                return res.send(Buffer.from(arrayBuffer));
            }
        }
    } catch (e) {
        // Fallback below
    }
    return res.sendFile(path.join(__dirname, '../favicon.png'));
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

app.post('/api/about/text', requireAdmin, async (req, res) => {
    try {
        const { title, text } = req.body;
        await upsertContent('about_title', title);
        await upsertContent('about_text', text);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Helper for upserting prices
async function upsertPrice(itemId, sectionKey, priceStr, priceUnit) {
    if (!priceStr && !priceUnit) return;
    const numericPrice = priceStr ? parseFloat(priceStr.toString().replace(/[^0-9,-]+/g,"").replace(',', '.')) : null;
    const itemType = sectionKey.includes('package') ? 'package' : 'service';
    
    await db.query(`
        INSERT INTO catalog_prices (item_id, item_type, price, price_unit)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (item_id, item_type)
        DO UPDATE SET price = EXCLUDED.price, price_unit = EXCLUDED.price_unit, updated_at = NOW()
    `, [itemId, itemType, numericPrice, priceUnit || null]);
}
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
app.get('/api/services', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'service'
            WHERE si.section_key='service' ORDER BY si.id DESC
        `);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/services/:id
app.get('/api/services/:id', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'service'
            WHERE si.id=$1
        `, [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
        const row = r.rows[0];
        res.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url, section_key: row.section_key, price: row.price, price_unit: row.price_unit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/services (create)
app.post('/api/services', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'services');
        const insertRes = await db.query(
            "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('service',$1,$2,$3,$4) RETURNING id",
            [fields.title, fields.text, fields.long_text, url]
        );
        await upsertPrice(insertRes.rows[0].id, 'service', fields.price, fields.price_unit);
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
        await upsertPrice(req.params.id, 'service', fields.price, fields.price_unit);
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
app.get('/api/packages', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'package'
            WHERE si.section_key='package' ORDER BY si.id DESC
        `);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/packages/:id
app.get('/api/packages/:id', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'package'
            WHERE si.id=$1
        `, [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
        const row = r.rows[0];
        res.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url, section_key: row.section_key, price: row.price, price_unit: row.price_unit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/packages
app.post('/api/packages', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'packages');
        const insertRes = await db.query(
            "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('package',$1,$2,$3,$4) RETURNING id",
            [fields.title, fields.text, fields.long_text, url]
        );
        await upsertPrice(insertRes.rows[0].id, 'package', fields.price, fields.price_unit);
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
        await upsertPrice(req.params.id, 'package', fields.price, fields.price_unit);
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

// GET /api/katalogs
app.get('/api/katalogs', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND 
                 ((si.section_key = 'catalog_service' AND cp.item_type = 'service') OR 
                  (si.section_key = 'catalog_package' AND cp.item_type = 'package'))
            WHERE si.section_key IN ('catalog_service', 'catalog_package') ORDER BY si.id DESC
        `);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/katalogs/:id
app.get('/api/katalogs/:id', async (req, res) => {
    try {
        const r = await db.query(`
            SELECT si.*, cp.price, cp.price_unit 
            FROM section_images si 
            LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND 
                 ((si.section_key = 'catalog_service' AND cp.item_type = 'service') OR 
                  (si.section_key = 'catalog_package' AND cp.item_type = 'package'))
            WHERE si.id=$1
        `, [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
        const row = r.rows[0];
        res.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url, section_key: row.section_key, price: row.price, price_unit: row.price_unit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/katalogs
app.post('/api/katalogs', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'katalogs');
        const sectionKey = fields.item_type || 'catalog_service';
        const insertRes = await db.query(
            "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES($1,$2,$3,$4,$5) RETURNING id",
            [sectionKey, fields.title, fields.text, fields.long_text, url]
        );
        await upsertPrice(insertRes.rows[0].id, sectionKey, fields.price, fields.price_unit);
        res.json({ message: 'Created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/katalogs/:id
app.put('/api/katalogs/:id', requireAdmin, async (req, res) => {
    try {
        const { fields, files } = await parseMultipart(req);
        let url = null;
        const file = files.find(f => f.fieldname === 'image');
        if (file) url = await uploadToSupabase(file.buffer, file.mimetype, 'katalogs');
        const sectionKey = fields.item_type || 'catalog_service';
        const query = url
            ? 'UPDATE section_images SET section_key=$1,title=$2,text=$3,long_text=$4,image_url=$5 WHERE id=$6'
            : 'UPDATE section_images SET section_key=$1,title=$2,text=$3,long_text=$4 WHERE id=$5';
        const params = url ? [sectionKey, fields.title, fields.text, fields.long_text, url, req.params.id] : [sectionKey, fields.title, fields.text, fields.long_text, req.params.id];
        await db.query(query, params);
        await upsertPrice(req.params.id, sectionKey, fields.price, fields.price_unit);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/katalogs/:id
app.delete('/api/katalogs/:id', requireAdmin, async (req, res) => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG PUBLIC ENDPOINTS (with price)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/catalog/services — semua layanan + harga untuk halaman katalog
app.get('/api/catalog/services', async (req, res) => {
    try {
        const r = await db.query(
            `SELECT si.id, si.title AS name, si.text AS description, si.long_text, si.image_url,
                    cp.price, cp.price_unit
             FROM section_images si
             LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'service'
             WHERE si.section_key IN ('service', 'catalog_service')
             ORDER BY si.id DESC`
        );
        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/catalog/data — gabungan layanan, paket, dan logo dalam satu request
app.get('/api/catalog/data', async (req, res) => {
    try {
        const data = await getCached('catalog_data', async () => {
            const [servicesRes, packagesRes, logoRes] = await Promise.all([
                db.query(
                    `SELECT si.id, si.title AS name, si.text AS description, si.long_text, si.image_url,
                            cp.price, cp.price_unit
                     FROM section_images si
                     LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'service'
                     WHERE si.section_key IN ('service', 'catalog_service')
                     ORDER BY si.id DESC`
                ),
                db.query(
                    `SELECT si.id, si.title AS name, si.text AS description, si.long_text, si.image_url,
                            cp.price, cp.price_unit
                     FROM section_images si
                     LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'package'
                     WHERE si.section_key IN ('package', 'catalog_package')
                     ORDER BY si.id DESC`
                ),
                db.query("SELECT content_value FROM site_content WHERE content_key = 'site_logo' LIMIT 1")
            ]);
            return {
                services: servicesRes.rows,
                packages: packagesRes.rows,
                site_logo: logoRes.rows.length > 0 ? logoRes.rows[0].content_value : ''
            };
        });

        res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/site/logo — hanya mengambil logo tanpa data content yang besar
app.get('/api/site/logo', async (req, res) => {
    try {
        const result = await db.query("SELECT content_value FROM site_content WHERE content_key = 'site_logo' LIMIT 1");
        const logoUrl = result.rows.length > 0 ? result.rows[0].content_value : '';
        res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.json({ site_logo: logoUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── Admin: Set/Update harga item katalog ──────────────────────────────────────

// PUT /api/catalog/price/:type/:id  (type = service | package)
app.put('/api/catalog/price/:type/:id', requireAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;
        if (!['service', 'package'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }
        const { price, price_unit } = req.body;
        const unit = price_unit || '/hari';

        // Upsert ke catalog_prices
        const existing = await db.query(
            'SELECT id FROM catalog_prices WHERE item_id=$1 AND item_type=$2',
            [id, type]
        );
        if (existing.rowCount > 0) {
            await db.query(
                'UPDATE catalog_prices SET price=$1, price_unit=$2 WHERE item_id=$3 AND item_type=$4',
                [price, unit, id, type]
            );
        } else {
            await db.query(
                'INSERT INTO catalog_prices(item_id, item_type, price, price_unit) VALUES($1,$2,$3,$4)',
                [id, type, price, unit]
            );
        }
        res.json({ message: 'Price updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/catalog/price/:type/:id
app.delete('/api/catalog/price/:type/:id', requireAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;
        await db.query('DELETE FROM catalog_prices WHERE item_id=$1 AND item_type=$2', [id, type]);
        res.json({ message: 'Price removed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



// Local Dev Fallbacks (matching vercel.json)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../home/index.html'));
});
app.get('/detail.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../home/detail.html'));
});

// Vercel export
module.exports = app;

// Local dev server
if (require.main === module) {
    const PORT = process.env.PORT || 3005;
    const server = app.listen(PORT, () => {
        console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    });
    server.on('error', (e) => {
        console.error('Server error:', e);
    });
}
