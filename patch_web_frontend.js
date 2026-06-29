const fs = require('fs');
const files = [
    'apps/web/public/home/detail.html',
    'apps/web/public/home/index.html',
    'apps/web/public/katalog/index.html',
    'apps/web/public/src/js/index.js',
    'apps/web/public/src/js/detail.js'
];

files.forEach(file => {
    let code = fs.readFileSync(file, 'utf8');
    
    // For HTML files with inline script
    code = code.replace(
        /fetch\(API \+ '\/api\/site\/logo'\)\s*\.then\(r => r\.json\(\)\)\s*\.then\(d => \{\s*const url = d\.site_logo;/,
        `fetch(API + '/api/site/logos').then(r => r.json()).then(d => { const url = d.web;`
    );
    
    code = code.replace(
        /'bsb_site_logo'/g,
        "'bsb_site_logo_web'"
    );

    // For JS files that might fetch /content
    code = code.replace(
        /content\.site_logo/g,
        "content.web"
    );

    fs.writeFileSync(file, code);
});
console.log('web frontend patched');
