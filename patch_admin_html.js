const fs = require('fs');
let code = fs.readFileSync('apps/web/public/admin/index.html', 'utf8');

// Replace the single logo upload button with three
code = code.replace(
    /<div class="flex items-center gap-4 border-b border-black\/5 pb-4 mb-4">[\s\S]*?<\/div>/,
    `<div class="flex flex-col gap-4 border-b border-black/5 pb-4 mb-4">
        <div class="flex items-center gap-4">
            <img id="admin-site-logo-web" src="/src/assets/images/logo-bsb.png" class="w-12 h-12 object-contain bg-slate-50 p-1 rounded border border-slate-200" alt="Web Logo">
            <div class="flex-1">
                <p class="text-xs font-bold text-slate-800 mb-1">Web Logo</p>
                <input type="file" id="logo-upload-web" accept="image/*" class="w-full text-[10px]">
            </div>
            <button id="btn-upload-logo-web" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded whitespace-nowrap">Update Web</button>
        </div>
        <div class="flex items-center gap-4">
            <img id="admin-site-logo-dashboard" src="/src/assets/images/logo-bsb.png" class="w-12 h-12 object-contain bg-slate-50 p-1 rounded border border-slate-200" alt="Dashboard Logo">
            <div class="flex-1">
                <p class="text-xs font-bold text-slate-800 mb-1">Dashboard Logo</p>
                <input type="file" id="logo-upload-dashboard" accept="image/*" class="w-full text-[10px]">
            </div>
            <button id="btn-upload-logo-dashboard" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded whitespace-nowrap">Update Dash</button>
        </div>
        <div class="flex items-center gap-4">
            <img id="admin-site-logo-cashflow" src="/src/assets/images/logo-bsb.png" class="w-12 h-12 object-contain bg-slate-50 p-1 rounded border border-slate-200" alt="Cashflow Logo">
            <div class="flex-1">
                <p class="text-xs font-bold text-slate-800 mb-1">Cashflow Logo</p>
                <input type="file" id="logo-upload-cashflow" accept="image/*" class="w-full text-[10px]">
            </div>
            <button id="btn-upload-logo-cashflow" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded whitespace-nowrap">Update Cash</button>
        </div>
    </div>`
);

// Update initial loader script
code = code.replace(
    /fetch\(API \+ '\/api\/site\/logo'\)\s*\.then[\s\S]*?}\);/g,
    `fetch(API + '/api/site/logos')
                .then(r => r.json())
                .then(d => {
                    const url = d.web;
                    if (url) {
                        localStorage.setItem('bsb_site_logo_web', url);
                        applyLogo(url);
                    }
                }).catch(e => {});`
);

// Update DOM logic for single applyLogo
code = code.replace(
    /const updateDOM = \(\) => {[\s\S]*?};\s*updateDOM\(\);/,
    `const updateDOM = () => {
                    ['login-logo', 'nav-logo', 'footer-logo'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el && el.src !== url) el.src = url;
                    });
                };
                updateDOM();`
);

fs.writeFileSync('apps/web/public/admin/index.html', code);
console.log('index.html updated');
