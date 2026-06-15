/**
 * admin.js — Beragam Sewa Bali Admin Panel
 * Optimized image previews with uniform box sizes.
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : '/api';
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
        el('modal-price-unit-input').value = item.price_unit || '';

        if (type === 'katalog' && el('modal-katalog-type-input')) {
            el('modal-katalog-type-input').value = item.section_key || 'catalog_service';
        }
    } else {
        el('modal-title-input').value = '';
        el('modal-text-input').value = '';
        el('modal-long-text-input').value = '';
        if(el('modal-price-input')) el('modal-price-input').value = '';
        if(el('modal-price-unit-input')) el('modal-price-unit-input').value = '';

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

// ── Data Loading ──────────────────────────────────────────────
async function loadSection(section) {
    try {
        if (section === 'hero') {
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
                if (el('admin-site-logo-preview')) el('admin-site-logo-preview').src = content.site_logo;
                if (el('login-logo')) el('login-logo').src = content.site_logo;
                if (el('nav-logo')) el('nav-logo').src = content.site_logo;
                if (el('favicon')) el('favicon').href = logoUrl;
            }
        }
    } catch (e) { console.error(`Error loading section ${section}:`, e); }
}

async function loadAll() {
    try {
        await Promise.all([
            loadSection('hero'),
            loadSection('about'),
            loadSection('service'),
            loadSection('package'),
            loadSection('katalog'),
            loadSection('gallery'),
            loadSection('content')
        ]);
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
                <img src="${item.image_url}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    ${section !== 'gallery' ? `<button type="button" class="btn-edit w-10 h-10 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                    <button type="button" class="btn-delete w-10 h-10 bg-white text-brand-red rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform" data-id="${item.id}" data-section="${section}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="p-5">
                <div class="flex justify-between items-center mb-1">
                    <h6 class="font-bold text-gray-800 text-xs truncate flex-1">${item.title || item.name || 'Untitled'}</h6>
                    ${section !== 'gallery' && (item.section_key === 'catalog_service' || item.section_key === 'catalog_package') ? '<span class="text-[9px] bg-brand-red/10 text-brand-red px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">Katalog Only</span>' : ''}
                </div>
                ${section !== 'gallery' ? `<p class="text-[10px] text-gray-400 line-clamp-1 italic">${item.text || item.description || ''}</p>` : ''}
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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        el(tabBtn.dataset.target.substring(1)).classList.add('active');
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
            if(el('modal-price-unit-input')) fd.append('price_unit', el('modal-price-unit-input').value);

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
