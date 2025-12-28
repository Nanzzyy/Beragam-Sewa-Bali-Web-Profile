const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Melayani file dari root (index.html, src, admin)
app.use('/uploads', express.static('uploads')); // Membuat folder 'uploads' bisa diakses publik

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// === API ENDPOINTS ===

// [GET] AMBIL SEMUA KONTEN UNTUK TAMPILAN PUBLIK
app.get('/api/content', async (req, res) => {
  try {
    const [contentRows] = await db.query('SELECT * FROM site_content');
    const [imageRows] = await db.query('SELECT * FROM section_images ORDER BY section_key, sort_order ASC');

    const siteContent = contentRows.reduce((acc, row) => ({ ...acc, [row.content_key]: row.content_value }), {});
    const groupedImages = imageRows.reduce((acc, img) => {
      if (!acc[img.section_key]) acc[img.section_key] = [];
      acc[img.section_key].push(img);
      return acc;
    }, {});

    res.json({ ...siteContent, ...groupedImages });
  } catch (error) {
    console.error("Error in " + req.path, error);
    res.status(500).json({ message: error.message });
  }
});

// [POST] UPDATE KONTEN TEKS
app.post('/api/content', async (req, res) => {
    const changes = req.body;
    try {
        const promises = Object.keys(changes).map(key =>
            db.query('UPDATE site_content SET content_value = ? WHERE content_key = ?', [changes[key], key])
        );
        await Promise.all(promises);
        res.json({ message: 'Konten teks berhasil diperbarui' });
    } catch (error) {
    console.error("Error in " + req.path, error);
    res.status(500).json({ message: error.message });
  }
});

// [POST] UPLOAD GAMBAR BARU UNTUK SECTION TERTENTU
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    
    const { section_key, caption } = req.body;
    const image_url = `/uploads/${req.file.filename}`;
    
    try {
        const sql = 'INSERT INTO section_images (section_key, image_url, caption) VALUES (?, ?, ?)';
        await db.query(sql, [section_key, image_url, caption || null]);
        res.status(201).json({ message: 'Gambar berhasil diupload', image_url });
    } catch (error) {
    console.error("Error in " + req.path, error);
    res.status(500).json({ message: error.message });
  }
});

// (Nantinya, Anda perlu endpoint DELETE untuk gambar)
// app.delete('/api/images/:id', ...)

app.listen(port, () => console.log(`Server berjalan di http://localhost:${port}`));