const fs = require('fs');
let code = fs.readFileSync('apps/web/public/admin/admin.js', 'utf8');

// Replace loadSection content fetch
code = code.replace(
    /const content = await fetch\(`\$\{API_URL\}\/content`, FETCH_OPTS\)\.then\(r => r\.json\(\)\);[\s\S]*?}\n\s*}/,
    `const content = await fetch(\`\${API_URL}/site/logos\`, FETCH_OPTS).then(r => r.json());
            const ts = '?t=' + new Date().getTime();
            
            if (content.web) {
                if (el('admin-site-logo-web')) el('admin-site-logo-web').src = content.web + ts;
                if (el('login-logo')) el('login-logo').src = content.web + ts;
                if (el('nav-logo')) el('nav-logo').src = content.web + ts;
                
                let favicon = document.getElementById('favicon') || document.querySelector("link[rel~='icon']");
                if (favicon) favicon.href = content.web + ts;
            }
            if (content.dashboard) {
                if (el('admin-site-logo-dashboard')) el('admin-site-logo-dashboard').src = content.dashboard + ts;
            }
            if (content.cashflow) {
                if (el('admin-site-logo-cashflow')) el('admin-site-logo-cashflow').src = content.cashflow + ts;
            }
        }`
);

// Replace button event listeners
code = code.replace(
    /if \(t\.id === 'btn-upload-logo'\) return handleUpload\('logo-upload', `\$\{API_URL\}\/site\/logo`, t\);/,
    `if (t.id === 'btn-upload-logo-web') return handleUpload('logo-upload-web', \`\${API_URL}/site/logo/web\`, t);
    if (t.id === 'btn-upload-logo-dashboard') return handleUpload('logo-upload-dashboard', \`\${API_URL}/site/logo/dashboard\`, t);
    if (t.id === 'btn-upload-logo-cashflow') return handleUpload('logo-upload-cashflow', \`\${API_URL}/site/logo/cashflow\`, t);`
);

// Fix the setTimeout loading text replacement
code = code.replace(
    /tBtn\.textContent = tBtn\.id === 'btn-upload-logo' \? 'Update Site Logo' : \(tBtn\.id === 'btn-upload-hero' \? 'Update Hero Image' : 'Update About Image'\);/,
    `tBtn.textContent = tBtn.id.includes('logo') ? 'Update Logo' : (tBtn.id === 'btn-upload-hero' ? 'Update Hero Image' : 'Update About Image');`
);

code = code.replace(
    /loadSection\(tBtn\.id === 'btn-upload-logo' \? 'content' : \(tBtn\.id === 'btn-upload-hero' \? 'hero' : 'about'\)\);/,
    `loadSection(tBtn.id.includes('logo') ? 'content' : (tBtn.id === 'btn-upload-hero' ? 'hero' : 'about'));`
);

fs.writeFileSync('apps/web/public/admin/admin.js', code);
console.log('admin.js updated');
