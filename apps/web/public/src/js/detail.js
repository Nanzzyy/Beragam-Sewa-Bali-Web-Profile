/**
 * detail.js — Beragam Sewa Bali
 * Optimized for professional layout and smooth rendering.
 */

const API_BASE = '/api';
const WA_PHONE = '6281338277098'; // Updated contact contact

async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type'); // service | package
    const id = params.get('id');
    const source = params.get('source'); // home | katalog

    const backBtn = document.getElementById('back-btn');
    const backText = document.getElementById('back-text');
    if (backBtn && backText) {
        if (source === 'katalog') {
            backBtn.href = 'https://katalog.beragamsewabali.com';
            backText.textContent = 'Kembali ke Katalog';
            backText.setAttribute('data-i18n', 'back_to_catalog');
        } else {
            backBtn.href = '/';
            backText.textContent = 'Kembali ke Beranda';
            backText.setAttribute('data-i18n', 'back_to_home');
        }
    }

    const skeleton = document.getElementById('detail-skeleton');
    const content = document.getElementById('detail-content');
    const errorState = document.getElementById('detail-error');

    if (!type || !id) {
        showError();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/${type}s/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        // Load Global Content for Logo
        try {
            const contentRes = await fetch(`${API_BASE}/site/logo`);
            if (contentRes.ok) {
                const contentData = await contentRes.json();
                if (contentData.site_logo) {
                    const navLogo = document.getElementById('nav-logo');
                    const favicon = document.getElementById('favicon');
                    if (navLogo) navLogo.src = contentData.site_logo;
                    if (favicon) {
                        // Tambahkan cache buster agar browser tidak ambil cache lama
                        favicon.href = contentData.site_logo + '?t=' + new Date().getTime();
                    }
                }
            }
        } catch (e) { console.warn('Logo fetch failed'); }

        renderData(data, type);
    } catch (err) {
        console.error(err);
        showError();
    }
}

function renderData(item, type) {
    const skeleton = document.getElementById('detail-skeleton');
    const content = document.getElementById('detail-content');

    // Fill data
    document.title = `${item.title || item.name} — Beragam Sewa Bali`;
    document.getElementById('detail-title').textContent = item.title || item.name;
    document.getElementById('detail-img').src = item.image_url;
    document.getElementById('detail-type').textContent = type.toUpperCase();
    const descText = item.long_text || item.text || item.description || 'Tidak ada detail tambahan.';
    document.getElementById('detail-desc').innerHTML = descText.replace(/\n/g, '<br>');

    // WA Link
    const message = encodeURIComponent(`Halo Beragam Sewa Bali, saya tertarik dengan ${type} "${item.title || item.name}". Bisa info harga dan ketersediaan?`);
    document.getElementById('wa-link').href = `https://wa.me/${WA_PHONE}?text=${message}`;

    // Transitions
    skeleton.classList.add('hidden');
    content.classList.remove('hidden');
}

function showError() {
    document.getElementById('detail-skeleton').classList.add('hidden');
    document.getElementById('detail-content').classList.add('hidden');
    document.getElementById('detail-error').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', loadDetail);
