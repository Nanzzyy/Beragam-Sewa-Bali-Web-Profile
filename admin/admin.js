const API_URL = 'http://localhost:3000';

// --- Fungsi Utama ---

async function loadContentForAdmin() {
    try {
        const response = await fetch(`${API_URL}/api/content`);
        if (!response.ok) throw new Error('Gagal mengambil data dari server');
        const data = await response.json();

        // Isi form teks
        document.getElementById('admin-home-title').value = data.home_title || '';
        document.getElementById('admin-home-subtitle').value = data.home_subtitle || '';
        document.getElementById('admin-about-title').value = data.about_title || '';
        document.getElementById('admin-about-text').value = data.about_text || '';

        // Tampilkan daftar gambar slider
        const sliderList = document.getElementById('home-slider-list');
        sliderList.innerHTML = ''; // Kosongkan daftar sebelum mengisi
        if (data.home_slider && Array.isArray(data.home_slider)) {
            data.home_slider.forEach(img => {
                const li = document.createElement('li');
                li.textContent = `${img.image_url.split('/').pop()}`;
                // TODO: Tambahkan tombol delete di sini yang memanggil API DELETE
                sliderList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Error loading content for admin:', error);
        alert(error.message);
    }
}

async function saveTextChanges() {
    const changes = {
        home_title: document.getElementById('admin-home-title').value,
        home_subtitle: document.getElementById('admin-home-subtitle').value,
        about_title: document.getElementById('admin-about-title').value,
        about_text: document.getElementById('admin-about-text').value,
    };

    try {
        const response = await fetch(`${API_URL}/api/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes)
        });
        if (!response.ok) throw new Error('Gagal menyimpan perubahan');
        alert('Perubahan teks berhasil disimpan!');
    } catch (error) {
        console.error('Error saving text changes:', error);
        alert(error.message);
    }
}

async function handleImageUpload(fileInputId, sectionKey) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput.files.length) {
        return alert('Pilih file gambar terlebih dahulu!');
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('section_key', sectionKey);

    try {
        const response = await fetch(`${API_URL}/api/upload/image`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Gagal upload gambar');
        
        alert('Gambar baru berhasil di-upload!');
        fileInput.value = ''; // Kosongkan input file
        loadContentForAdmin(); // Muat ulang data untuk menampilkan gambar baru di daftar
    } catch (error) {
        console.error('Error uploading image:', error);
        alert(error.message);
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', loadContentForAdmin);

document.getElementById('save-text-btn').addEventListener('click', saveTextChanges);

document.getElementById('add-home-slider-btn').addEventListener('click', () => 
    handleImageUpload('home-slider-file-input', 'home_slider')
);
