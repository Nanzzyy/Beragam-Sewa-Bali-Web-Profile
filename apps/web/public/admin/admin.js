/**
 * admin.js — Beragam Sewa Bali Admin Panel
 * Optimized image previews with uniform box sizes.
 */

const API_URL = 'https://api.beragamsewabali.com/api';
const FETCH_OPTS = { credentials: 'include' };

const el = (id) => document.getElementById(id);

// ── Modal Controller ──────────────────────────────────────────
function openModal(type, item = null) {
    const modal = el('admin-modal');
    if (!modal) return;

    el('modal-form').reset();
    el('modal-type-input').value = type;
    el('modal-id-input').value = item ? item.id : '';
    el('modal-title').textContent = (item ? 'Configure ' : 'Create ') + type.charAt(0).toUpperCase() + type.slice(1);
    
    if (item) {
        el('modal-title-input').value = item.title || item.name || '';
        el('modal-text-input').value = item.text || item.description || '';
        el('modal-long-text-input').value = item.long_text || '';
        
        if (item.price) {
            el('modal-price-input').value = item.price.toString();
            if (window.formatRupiah) window.formatRupiah(el('modal-price-input'));
        } else {
            el('modal-price-input').value = '';
        }
        
        if (item.price_unit) {
            const match = item.price_unit.match(/\/ (\d+) (Day|Hour)s?/i);
            if (match) {
                el('modal-duration-amount').value = match[1];
                el('modal-duration-type').value = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
            } else {
                const low = item.price_unit.toLowerCase();
                el('modal-duration-amount').value = '1';
                el('modal-duration-type').value = low.includes('hour') ? 'Hour' : 'Day';
            }
        } else {
            el('modal-duration-amount').value = '';
            el('modal-duration-type').value = 'Day';
        }

        if (type === 'katalog' && el('modal-katalog-type-input')) {
            el('modal-katalog-type-input').value = item.section_key || 'catalog_service';
        }
    } else {
        el('modal-title-input').value = '';
        el('modal-text-input').value = '';
        el('modal-long-text-input').value = '';
        if(el('modal-price-input')) el('modal-price-input').value = '';
        if(el('modal-duration-amount')) el('modal-duration-amount').value = '';
        if(el('modal-duration-type')) el('modal-duration-type').value = 'Day';

        if (type === 'katalog' && el('modal-katalog-type-input')) {
            el('modal-katalog-type-input').value = 'catalog_service';
        }
    }

    if (type === 'katalog') {
        if(el('modal-katalog-type-container')) el('modal-katalog-type-container').style.display = 'block';
    } else {
        if(el('modal-katalog-type-container')) el('modal-katalog-type-container').style.display = 'none';
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = el('admin-modal');
    if (modal) modal.style.display = 'none';
}

function openMobileDrawer() {
    const drawer = el('mobile-menu-drawer');
    const content = el('mobile-menu-content');
    if (drawer && content) {
        drawer.style.display = 'block';
        // Force reflow to allow transition to run
        drawer.offsetHeight;
        drawer.classList.remove('pointer-events-none', 'opacity-0');
        content.classList.remove('-translate-x-full');
    }
}

function closeMobileDrawer() {
    const drawer = el('mobile-menu-drawer');
    const content = el('mobile-menu-content');
    if (drawer && content) {
        drawer.classList.add('pointer-events-none', 'opacity-0');
        content.classList.add('-translate-x-full');
        setTimeout(() => {
            if (drawer.classList.contains('opacity-0')) {
                drawer.style.display = 'none';
            }
        }, 300);
    }
}

// ── Data Loading ──────────────────────────────────────────────
let overviewRefreshInterval = null;

async function loadSection(section) {
    try {
        if (section === 'overview') {
            const data = await fetch(`${API_URL}/admin/overview`, FETCH_OPTS).then(r => r.json());
            if (el('stat-services')) el('stat-services').textContent = data.services || 0;
            if (el('stat-packages')) el('stat-packages').textContent = data.packages || 0;
            if (el('stat-gallery')) el('stat-gallery').textContent = data.gallery || 0;
            if (el('stat-inventory')) el('stat-inventory').textContent = data.inventory || 0;
            if (el('stat-cashflow-in')) el('stat-cashflow-in').textContent = window.formatPriceLabel ? window.formatPriceLabel(data.cashflow?.inflow || 0) : `Rp ${data.cashflow?.inflow || 0}`;
            if (el('stat-cashflow-out')) el('stat-cashflow-out').textContent = window.formatPriceLabel ? window.formatPriceLabel(data.cashflow?.outflow || 0) : `Rp ${data.cashflow?.outflow || 0}`;
            
            // Setup real-time monitoring (refresh every 15 seconds)
            if (!overviewRefreshInterval) {
                overviewRefreshInterval = setInterval(() => {
                    if (el('overview-content').classList.contains('active')) {
                        loadSection('overview');
                    }
                }, 15000);
            }
        } else if (section === 'hero') {
            const hero = await fetch(`${API_URL}/hero`, FETCH_OPTS).then(r => r.json());
            if(el('hero-title-input')) el('hero-title-input').value = hero.title || '';
            if(el('hero-subtitle-input')) el('hero-subtitle-input').value = hero.subtitle || '';
            renderImages('hero-slider-list', hero.images, 'hero');
        } else if (section === 'about') {
            const about = await fetch(`${API_URL}/about`, FETCH_OPTS).then(r => r.json());
            if(el('about-title-input')) el('about-title-input').value = about.title || '';
            if(el('about-text-input')) el('about-text-input').value = about.text || '';
            renderImages('about-carousel-list', about.images, 'about');
        } else if (section === 'service') {
            const srv = await fetch(`${API_URL}/services`, FETCH_OPTS).then(r => r.json());
            renderCards('services-list', srv, 'service');
        } else if (section === 'package') {
            const pkg = await fetch(`${API_URL}/packages`, FETCH_OPTS).then(r => r.json());
            renderCards('packages-list', pkg, 'package');
        } else if (section === 'katalog') {
            const kat = await fetch(`${API_URL}/katalogs`, FETCH_OPTS).then(r => r.json());
            renderCards('katalog-list', kat, 'katalog');
        } else if (section === 'gallery') {
            const gal = await fetch(`${API_URL}/gallery`, FETCH_OPTS).then(r => r.json());
            renderCards('gallery-list', gal, 'gallery');
        } else if (section === 'content') {
            const content = await fetch(`${API_URL}/content`, FETCH_OPTS).then(r => r.json());
            if (content.site_logo) {
                const logoUrl = content.site_logo + '?t=' + new Date().getTime();
                let favicon = document.getElementById('favicon') || document.querySelector("link[rel~='icon']");
                if (!favicon) {
                    favicon = document.createElement('link');
                    favicon.rel = 'icon';
                    favicon.id = 'favicon';
                    document.head.appendChild(favicon);
                }
                favicon.href = logoUrl;
                if (el('admin-site-logo-preview')) el('admin-site-logo-preview').src = content.site_logo;
                if (el('login-logo')) el('login-logo').src = content.site_logo;
                if (el('nav-logo')) el('nav-logo').src = content.site_logo;
            }
        }
    } catch (e) { console.error(`Error loading section ${section}:`, e); }
}

async function loadAll() {
    try {
        await Promise.all([
            loadSection('overview'),
            loadSection('hero'),
            loadSection('content')
        ]);
        
        // Start live clock
        setInterval(() => {
            if (el('live-clock')) {
                const now = new Date();
                el('live-clock').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WITA';
            }
        }, 1000);
    } catch (e) { console.error('Data Sync Error'); }
}

// ── Renderers ─────────────────────────────────────────────────
function renderImages(id, items, section) {
    const list = el(id); if(!list) return;
    list.innerHTML = '';
    (items || []).forEach(img => {
        const d = document.createElement('div');
        d.className = 'flex items-center justify-between p-3 bg-white rounded-2xl border border-black/5 shadow-sm';
        d.innerHTML = `
            <div class="flex items-center gap-4">
                <!-- Kotak Preview Seragam -->
                <div class="w-20 h-12 rounded-lg overflow-hidden border border-black/5 flex-shrink-0 bg-gray-100">
                    <img src="${img.image_url}" class="w-full h-full object-cover">
                </div>
                <span class="text-[10px] font-bold text-gray-400 tracking-widest">ID #${img.id}</span>
            </div>
            <button type="button" class="btn-delete w-8 h-8 text-brand-red hover:bg-red-50 rounded-lg transition-all" data-id="${img.id}" data-section="${section}"><i class="fa-solid fa-trash-can text-lg"></i></button>
        `;
        list.appendChild(d);
    });
}

function renderCards(id, items, section) {
    const list = el(id); if(!list) return;
    list.innerHTML = '';
    (items || []).forEach(item => {
        const d = document.createElement('div');
        d.className = 'admin-card group';
        d.innerHTML = `
            <!-- Kotak Preview Kartu Seragam -->
            <div class="relative aspect-video overflow-hidden bg-gray-100">
                <img src="${item.image_url}" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-3">
                    ${section !== 'gallery' ? `<button type="button" class="btn-edit w-10 h-10 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                    <button type="button" class="btn-delete w-10 h-10 bg-white text-brand-red rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="p-5">
                <div class="flex justify-between items-center mb-1">
                    <h6 class="font-bold text-gray-800 text-xs truncate flex-1">${item.title || item.name || 'Untitled'}</h6>
                    ${section !== 'gallery' && (item.section_key === 'catalog_service' || item.section_key === 'catalog_package') ? '<span class="text-[9px] bg-brand-red/10 text-brand-red px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">Katalog Only</span>' : ''}
                </div>
                ${section !== 'gallery' ? `<p class="text-[10px] text-gray-400 line-clamp-1 italic mb-1">${item.text || item.description || ''}</p>` : ''}
                ${section !== 'gallery' && item.price ? `<p class="text-[11px] font-bold text-brand-red mb-2">${window.formatPriceLabel ? window.formatPriceLabel(item.price) : item.price} <span class="text-[9px] text-gray-500">${item.price_unit || ''}</span></p>` : ''}
                
                <!-- Action row always visible on mobile, hidden on desktop -->
                <div class="flex items-center gap-2 mt-3 md:hidden border-t border-black/5 pt-3">
                    ${section !== 'gallery' ? `<button type="button" class="btn-edit flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>` : ''}
                    <button type="button" class="btn-delete flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-brand-red rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-trash"></i> Hapus</button>
                </div>
            </div>
        `;
        list.appendChild(d);
    });
}

// ── Event Controller ─────────────────────────────────────────
document.addEventListener('click', async (e) => {
    const t = e.target;

    const tabBtn = t.closest('.tab-btn');
    if (tabBtn) {
        const targetSelector = tabBtn.getAttribute('data-target');
        const target = targetSelector.substring(1);
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll(`.tab-btn[data-target="${targetSelector}"]`).forEach(b => b.classList.add('active'));
        
        document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.remove('active'));
        el(target).classList.add('active');
        
        const listMap = {
            'overview-content': 'overview',
            'about-content': 'about',
            'services-content': 'service',
            'packages-content': 'package',
            'katalog-content': 'katalog',
            'gallery-content': 'gallery'
        };
        if (listMap[target]) {
            loadSection(listMap[target]);
        }
        closeMobileDrawer();
        return;
    }

    if (t.id === 'menu-toggle-btn' || t.closest('#menu-toggle-btn')) {
        openMobileDrawer();
        return;
    }
    if (t.id === 'close-drawer-btn' || t.closest('#close-drawer-btn') || t.id === 'mobile-menu-drawer') {
        closeMobileDrawer();
        return;
    }

    if (t.id === 'add-service-btn') return openModal('service');
    if (t.id === 'add-package-btn') return openModal('package');
    if (t.id === 'add-katalog-btn') return openModal('katalog');
    if (t.closest('.close-modal-btn')) return closeModal();

    const delBtn = t.closest('.btn-delete');
    if (delBtn) {
        const { id, section } = delBtn.dataset;
        if (!confirm('Hapus item ini selamanya?')) return;
        await fetch(section === 'hero' ? `${API_URL}/hero/image/${id}` : section === 'about' ? `${API_URL}/about/image/${id}` : section === 'gallery' ? `${API_URL}/gallery/${id}` : `${API_URL}/${section}s/${id}`, { ...FETCH_OPTS, method: 'DELETE' });
        loadSection(section);
        return;
    }

    const editBtn = t.closest('.btn-edit');
    if (editBtn) {
        const { id, section } = editBtn.dataset;
        const res = await fetch(`${API_URL}/${section}s/${id}`, FETCH_OPTS);
        const data = await res.json();
        openModal(section, data);
        return;
    }

    // Direct Uploads
    const handleUpload = async (fileId, endpoint, tBtn) => {
        const file = el(fileId).files[0];
        if(!file) return alert('No file chosen');
        const fd = new FormData(); fd.append('image', file);
        tBtn.disabled = true; tBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing';
        
        try {
            const res = await fetch(endpoint, { ...FETCH_OPTS, method: 'POST', body: fd });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Upload failed');
            }
            el(fileId).value = ''; 
            tBtn.disabled = false; 
            tBtn.textContent = 'Upload Success';
            setTimeout(() => {
                tBtn.textContent = tBtn.id === 'btn-upload-logo' ? 'Update Site Logo' : (tBtn.id === 'btn-upload-hero' ? 'Update Hero Image' : 'Update About Image');
                loadSection(tBtn.id === 'btn-upload-logo' ? 'content' : (tBtn.id === 'btn-upload-hero' ? 'hero' : 'about'));
            }, 2000);
        } catch (err) {
            alert(err.message);
            tBtn.disabled = false;
            tBtn.textContent = 'Upload Failed';
        }
    };

    if (t.id === 'btn-upload-hero') return handleUpload('hero-image-upload', `${API_URL}/hero/image`, t);
    if (t.id === 'btn-upload-about') return handleUpload('about-image-upload', `${API_URL}/about/image`, t);
    if (t.id === 'btn-upload-logo') return handleUpload('logo-upload', `${API_URL}/site/logo`, t);
    
    if (t.id === 'btn-upload-gallery') {
        const files = el('gallery-image-upload').files;
        if(!files.length) return alert('No images');
        const fd = new FormData(); for(let f of files) fd.append('images', f);
        t.disabled = true; t.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading';
        await fetch(`${API_URL}/gallery`, { ...FETCH_OPTS, method: 'POST', body: fd });
        el('gallery-image-upload').value = ''; t.disabled = false; t.textContent = 'Upload Success';
        loadSection('gallery');
    }
});

document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = e.submitter;
    if(btn) btn.disabled = true;

    try {
        if (f.id === 'hero-form') {
            await fetch(`${API_URL}/hero/text`, { ...FETCH_OPTS, method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({title:el('hero-title-input').value, subtitle:el('hero-subtitle-input').value})});
            alert('Updated!');
        } else if (f.id === 'about-form') {
            await fetch(`${API_URL}/about/text`, { ...FETCH_OPTS, method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({title:el('about-title-input').value, text:el('about-text-input').value})});
            alert('Updated!');
        } else if (f.id === 'modal-form') {
            const type = el('modal-type-input').value;
            const id = el('modal-id-input').value;
            const fd = new FormData();
            fd.append('title', el('modal-title-input').value);
            fd.append('text', el('modal-text-input').value);
            fd.append('long_text', el('modal-long-text-input').value);
            if(el('modal-price-input')) fd.append('price', el('modal-price-input').value);
            
            if (el('modal-duration-amount') && el('modal-duration-amount').value) {
                const amount = el('modal-duration-amount').value;
                const unitType = el('modal-duration-type').value;
                const unitStr = amount == 1 ? `/ ${amount} ${unitType}` : `/ ${amount} ${unitType}s`;
                fd.append('price_unit', unitStr);
            }

            if (type === 'katalog' && el('modal-katalog-type-input')) {
                fd.append('item_type', el('modal-katalog-type-input').value);
            }
            if(el('modal-image-input').files[0]) fd.append('image', el('modal-image-input').files[0]);
            await fetch(id ? `${API_URL}/${type}s/${id}` : `${API_URL}/${type}s`, { ...FETCH_OPTS, method: id ? 'PUT' : 'POST', body: fd });
            closeModal();
            loadSection(type);
        }
    } catch (e) { alert('Operation Failed'); }
    if(btn) btn.disabled = false;
});

window.initAdmin = loadAll;
window.loadAllData = loadAll;

window.formatRupiah = function(input) {
    let value = input.value.replace(/[^,\d]/g, '').toString();
    let split = value.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    input.value = rupiah ? 'Rp ' + rupiah : '';
};

window.formatPriceLabel = function(price) {
    if (!price && price !== 0) return '';
    const num = parseFloat(price);
    if (isNaN(num)) return '';
    return 'Rp ' + num.toLocaleString('id-ID');
};
