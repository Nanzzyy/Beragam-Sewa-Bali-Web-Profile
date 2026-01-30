const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// Helper function to delete a file
const deleteFile = (imageUrl) => {
    if (!imageUrl) return;
    const imagePath = path.join(__dirname, imageUrl);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }
};


// === NEW RESTful API ENDPOINTS ===

// --- Hero Section ---
app.get('/api/hero', async (req, res) => {
    try {
        const [textRows] = await db.query("SELECT * FROM site_content WHERE content_key IN ('home_title', 'home_subtitle')");
        const [imageRows] = await db.query("SELECT * FROM section_images WHERE section_key = 'home_slider' ORDER BY sort_order ASC");
        const texts = textRows.reduce((acc, row) => ({ ...acc, [row.content_key]: row.content_value }), {});
        res.json({ title: texts.home_title || '', subtitle: texts.home_subtitle || '', images: imageRows });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/hero/text', async (req, res) => {
    const { title, subtitle } = req.body;
    try {
        await db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [title, 'home_title']);
        await db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [subtitle, 'home_subtitle']);
        res.json({ message: 'Hero text updated successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/hero/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file found' });
    const image_url = `/uploads/${req.file.filename}`;
    try {
        await db.query("INSERT INTO section_images (section_key, image_url) VALUES ('home_slider', ?)", [image_url]);
        res.status(201).json({ message: 'Hero image uploaded successfully', image_url });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/hero/image/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT image_url FROM section_images WHERE id = ?', [id]);
        if (rows.length > 0) deleteFile(rows[0].image_url);
        await db.query('DELETE FROM section_images WHERE id = ?', [id]);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- About Section ---
app.get('/api/about', async (req, res) => {
    try {
        const [textRows] = await db.query("SELECT * FROM site_content WHERE content_key IN ('about_title', 'about_text')");
        const [imageRows] = await db.query("SELECT * FROM section_images WHERE section_key = 'about_carousel' ORDER BY sort_order ASC");
        const texts = textRows.reduce((acc, row) => ({ ...acc, [row.content_key]: row.content_value }), {});
        res.json({ title: texts.about_title || '', text: texts.about_text || '', images: imageRows });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/about/text', async (req, res) => {
    const { title, text } = req.body;
    try {
        await db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [title, 'about_title']);
        await db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [text, 'about_text']);
        res.json({ message: 'About text updated successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/about/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file found' });
    const image_url = `/uploads/${req.file.filename}`;
    try {
        await db.query("INSERT INTO section_images (section_key, image_url) VALUES ('about_carousel', ?)", [image_url]);
        res.status(201).json({ message: 'About image uploaded successfully', image_url });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/about/image/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT image_url FROM section_images WHERE id = ?', [id]);
        if (rows.length > 0) deleteFile(rows[0].image_url);
        await db.query('DELETE FROM section_images WHERE id = ?', [id]);
        res.json({ message: 'Image deleted successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});


// --- Reusable Handlers for Services & Packages ---

const getAllItems = (sectionKey) => async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM section_images WHERE section_key = ? ORDER BY id DESC', [sectionKey]);
        res.json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getSingleItem = () => async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM section_images WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Item not found' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const createItem = (sectionKey) => async (req, res) => {
    const { title, text } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });
    const image_url = `/uploads/${req.file.filename}`;
    try {
        const sql = 'INSERT INTO section_images (section_key, image_url, title, text) VALUES (?, ?, ?, ?)';
        await db.query(sql, [sectionKey, image_url, title, text]);
        res.status(201).json({ message: 'Item created successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateItem = () => async (req, res) => {
    const { id } = req.params;
    const { title, text } = req.body;
    
    try {
        const [existing] = await db.query('SELECT image_url FROM section_images WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Item not found' });

        let imageUrl = existing[0].image_url;

        if (req.file) {
            deleteFile(existing[0].image_url); // Delete old file
            imageUrl = `/uploads/${req.file.filename}`; // Set new file URL
        }

        const sql = 'UPDATE section_images SET title = ?, text = ?, image_url = ? WHERE id = ?';
        await db.query(sql, [title, text, imageUrl, id]);
        res.json({ message: 'Item updated successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteItem = () => async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT image_url FROM section_images WHERE id = ?', [id]);
        if (rows.length > 0) deleteFile(rows[0].image_url);
        await db.query('DELETE FROM section_images WHERE id = ?', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Services Routes ---
app.get('/api/services', getAllItems('service'));
app.get('/api/services/:id', getSingleItem());
app.post('/api/services', upload.single('image'), createItem('service'));
app.put('/api/services/:id', upload.single('image'), updateItem());
app.delete('/api/services/:id', deleteItem());

// --- Packages Routes ---
app.get('/api/packages', getAllItems('package'));
app.get('/api/packages/:id', getSingleItem());
app.post('/api/packages', upload.single('image'), createItem('package'));
app.put('/api/packages/:id', upload.single('image'), updateItem());
app.delete('/api/packages/:id', deleteItem());


// --- Gallery Routes ---
const createGalleryItems = (sectionKey) => async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Image files are required' });
    }
    const image_urls = req.files.map(file => `/uploads/${file.filename}`);
    try {
        const sql = 'INSERT INTO section_images (section_key, image_url) VALUES ?';
        const values = image_urls.map(url => [sectionKey, url]);
        await db.query(sql, [values]);
        res.status(201).json({ message: 'Items created successfully' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
app.get('/api/gallery', getAllItems('gallery'));
app.post('/api/gallery', upload.array('images', 12), createGalleryItems('gallery'));
app.delete('/api/gallery/:id', deleteItem());


// === OLD MONOLITHIC API ENDPOINTS (for reference/fallback) ===

// [GET] AMBIL SEMUA KONTEN UNTUK TAMPILAN PUBLIK
app.get('/api/content', async (req, res) => {
  try {
    const [contentRows] = await db.query('SELECT * FROM site_content');
    const [imageRows] = await db.query('SELECT * FROM section_images ORDER BY section_key, sort_order ASC, id DESC');
    const siteContent = contentRows.reduce((acc, row) => ({ ...acc, [row.content_key]: row.content_value }), {});
    
    const groupedImages = imageRows.reduce((acc, img) => {
      // CORRECTED LOGIC: Only pluralize 'service' and 'package'.
      let key = img.section_key;
      if (key === 'service' || key === 'package') {
        key = `${key}s`;
      }
      
      if (!acc[key]) acc[key] = [];

      // FIX: Map database fields (title, text) to frontend fields (name, description)
      if (key === 'services' || key === 'packages') {
        acc[key].push({
            id: img.id,
            image_url: img.image_url,
            name: img.title,       // Map title to name
            description: img.text, // Map text to description
            caption: img.caption,
            sort_order: img.sort_order
        });
      } else {
        // For other sections (hero, about, etc.), push the original object
        acc[key].push(img);
      }
      return acc;
    }, {});

    res.json({ ...siteContent, ...groupedImages });
  } catch (error) {
    console.error("Error in /api/content", error);
    res.status(500).json({ message: error.message });
  }
});

// [POST] UPDATE KONTEN TEKS (Dari admin lama)
app.post('/api/content', async (req, res) => {
    const changes = req.body;
    try {
        const promises = Object.keys(changes).map(key =>
            db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [changes[key], key])
        );
        await Promise.all(promises);
        res.json({ message: 'Konten teks berhasil diperbarui' });
    } catch (error) {
    console.error("Error in POST /api/content", error);
    res.status(500).json({ message: error.message });
  }
});

// [POST] UPLOAD GAMBAR BARU (Dari admin lama)
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    const { section_key, caption } = req.body;
    const image_url = `/uploads/${req.file.filename}`;
    try {
        const sql = 'INSERT INTO section_images (section_key, image_url, caption) VALUES (?, ?, ?)';
        await db.query(sql, [section_key, image_url, caption || null]);
        res.status(201).json({ message: 'Gambar berhasil diupload', image_url });
    } catch (error) {
    console.error("Error in POST /api/upload/image", error);
    res.status(500).json({ message: error.message });
  }
});


app.listen(port, () => console.log(`Server berjalan di http://localhost:${port}`));