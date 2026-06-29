const fs = require('fs');
let code = fs.readFileSync('api/index.js', 'utf8');

// Modify the POST route
code = code.replace(
    /app\.post\('\/api\/site\/logo', requireAdmin, async \(req, res\) => {[\s\S]*?}\);/,
    `app.post('/api/site/logo/:appType', requireAdmin, async (req, res) => {
    try {
        const { appType } = req.params;
        const validApps = ['web', 'dashboard', 'cashflow'];
        if (!validApps.includes(appType)) return res.status(400).json({ error: 'Invalid app type' });

        const { files } = await parseMultipart(req);
        const file = files.find(f => f.fieldname === 'image');
        if (!file) return res.status(400).json({ error: 'No image' });
        
        const url = await uploadToSupabase(file.buffer, file.mimetype, 'logos');
        await upsertContent('site_logo_' + appType, url);
        res.json({ message: 'Updated', url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});`
);

// Modify the GET route
code = code.replace(
    /app\.get\('\/api\/site\/logo', async \(req, res\) => {[\s\S]*?}\);/,
    `app.get('/api/site/logos', async (req, res) => {
    try {
        const result = await db.query("SELECT content_key, content_value FROM site_content WHERE content_key IN ('site_logo_web', 'site_logo_dashboard', 'site_logo_cashflow')");
        const logos = {
            web: result.rows.find(r => r.content_key === 'site_logo_web')?.content_value || '',
            dashboard: result.rows.find(r => r.content_key === 'site_logo_dashboard')?.content_value || '',
            cashflow: result.rows.find(r => r.content_key === 'site_logo_cashflow')?.content_value || ''
        };
        res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        res.json(logos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});`
);

// Modify the general /api/content route to return all logos
code = code.replace(
    /let content = \{\};[\s\S]*?res\.json\(content\);/,
    `let content = {};
        result.rows.forEach(r => content[r.content_key] = r.content_value);
        res.json(content);`
);

fs.writeFileSync('api/index.js', code);
console.log('Done');
