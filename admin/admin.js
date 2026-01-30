document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    let serviceModal, packageModal; // instances for bootstrap modals

    // --- GLOBAL ELEMENT REFERENCES ---
    // Hero
    const heroForm = document.getElementById('hero-form');
    const heroTitleInput = document.getElementById('hero-title-input');
    const heroSubtitleInput = document.getElementById('hero-subtitle-input');
    const heroSliderList = document.getElementById('hero-slider-list');
    const heroImageForm = document.getElementById('hero-image-form');
    const heroImageUpload = document.getElementById('hero-image-upload');
    // About
    const aboutForm = document.getElementById('about-form');
    const aboutTitleInput = document.getElementById('about-title-input');
    const aboutTextInput = document.getElementById('about-text-input');
    const aboutCarouselList = document.getElementById('about-carousel-list');
    const aboutImageForm = document.getElementById('about-image-form');
    const aboutImageUpload = document.getElementById('about-image-upload');
    // Services
    const servicesList = document.getElementById('services-list');
    const addServiceBtn = document.getElementById('add-service-btn');
    const serviceModalEl = document.getElementById('service-modal');
    const serviceForm = document.getElementById('service-form');
    const serviceModalTitle = document.getElementById('service-modal-title');
    const serviceIdInput = document.getElementById('service-id-input');
    const serviceTitleInput = document.getElementById('service-title-input');
    const serviceTextInput = document.getElementById('service-text-input');
    const serviceImageInput = document.getElementById('service-image-input');
    // Packages
    const packagesList = document.getElementById('packages-list');
    const addPackageBtn = document.getElementById('add-package-btn');
    const packageModalEl = document.getElementById('package-modal');
    const packageForm = document.getElementById('package-form');
    const packageModalTitle = document.getElementById('package-modal-title');
    const packageIdInput = document.getElementById('package-id-input');
    const packageTitleInput = document.getElementById('package-title-input');
    const packageTextInput = document.getElementById('package-text-input');
    const packageImageInput = document.getElementById('package-image-input');
    // Gallery
    const galleryList = document.getElementById('gallery-list');
    const galleryImageForm = document.getElementById('gallery-image-form');
    const galleryImageUpload = document.getElementById('gallery-image-upload');


    // --- GENERIC RENDER/API FUNCTIONS ---
    const createItemCard = (item, section) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${item.image_url}" class="card-img-top" alt="${item.title}" style="height: 150px; object-fit: cover;">
            <div class="card-body">
                <h5 class="card-title">${item.title || 'Gallery Image'}</h5>
                ${item.text ? `<p class="card-text" style="font-size: 0.8rem;">${item.text.substring(0, 50)}...</p>` : ''}
                ${section !== 'gallery' ? `<button class="btn btn-sm btn-primary edit-btn" data-id="${item.id}" data-section="${section}">Edit</button>` : ''}
                <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}" data-section="${section}">Delete</button>
            </div>
        `;
        return card;
    };
    
    // --- HERO SECTION ---
    const renderHeroImages = (images) => {
        heroSliderList.innerHTML = '';
        if (!images || images.length === 0) {
            heroSliderList.innerHTML = '<p class="text-muted">No images found.</p>';
            return;
        }
        images.forEach(image => {
            const imageEl = document.createElement('div');
            imageEl.className = 'image-list-item';
            imageEl.innerHTML = `
                <div>
                    <img src="${image.image_url}" alt="Hero Slider Image">
                    <span>${image.image_url.split('/').pop()}</span>
                </div>
                <button class="btn btn-danger btn-sm" data-id="${image.id}" data-section="hero">Delete</button>
            `;
            heroSliderList.appendChild(imageEl);
        });
    };
    const loadHeroData = async () => {
        try {
            const response = await fetch(`${API_URL}/hero`); 
            if (!response.ok) throw new Error('Failed to fetch hero data');
            const data = await response.json();
            heroTitleInput.value = data.title || '';
            heroSubtitleInput.value = data.subtitle || '';
            renderHeroImages(data.images);
        } catch (error) { console.error('Error loading hero data:', error); }
    };
    const saveHeroText = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/hero/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: heroTitleInput.value, subtitle: heroSubtitleInput.value })
            });
            if (!response.ok) throw new Error('Failed to save hero text');
            alert('Hero text saved successfully!');
        } catch (error) { console.error('Error saving hero text:', error); alert('Could not save hero text.'); }
    };
    const uploadHeroImage = async (e) => {
        e.preventDefault();
        if (!heroImageUpload.files.length) return alert('Please select an image file first.');
        const formData = new FormData();
        formData.append('image', heroImageUpload.files[0]);
        try {
            const response = await fetch(`${API_URL}/hero/image`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Failed to upload image');
            alert('Image uploaded successfully!');
            heroImageUpload.value = '';
            loadHeroData();
        } catch (error) { console.error('Error uploading hero image:', error); alert('Could not upload image.'); }
    };

    // --- ABOUT SECTION ---
    const renderAboutImages = (images) => {
        aboutCarouselList.innerHTML = '';
        if (!images || images.length === 0) {
            aboutCarouselList.innerHTML = '<p class="text-muted">No images found.</p>';
            return;
        }
        images.forEach(image => {
            const imageEl = document.createElement('div');
            imageEl.className = 'image-list-item';
            imageEl.innerHTML = `
                <div>
                    <img src="${image.image_url}" alt="About Carousel Image">
                    <span>${image.image_url.split('/').pop()}</span>
                </div>
                <button class="btn btn-danger btn-sm" data-id="${image.id}" data-section="about">Delete</button>
            `;
            aboutCarouselList.appendChild(imageEl);
        });
    };
    const loadAboutData = async () => {
        try {
            const response = await fetch(`${API_URL}/about`);
            if (!response.ok) throw new Error('Failed to fetch about data');
            const data = await response.json();
            aboutTitleInput.value = data.title || '';
            aboutTextInput.value = data.text || '';
            renderAboutImages(data.images);
        } catch (error) { console.error('Error loading about data:', error); }
    };
    const saveAboutText = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/about/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: aboutTitleInput.value, text: aboutTextInput.value })
            });
            if (!response.ok) throw new Error('Failed to save about text');
            alert('About text saved successfully!');
        } catch (error) { console.error('Error saving about text:', error); alert('Could not save about text.'); }
    };
    const uploadAboutImage = async (e) => {
        e.preventDefault();
        if (!aboutImageUpload.files.length) return alert('Please select an image file first.');
        const formData = new FormData();
        formData.append('image', aboutImageUpload.files[0]);
        try {
            const response = await fetch(`${API_URL}/about/image`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Failed to upload image');
            alert('Image uploaded successfully!');
            aboutImageUpload.value = '';
            loadAboutData();
        } catch (error) { console.error('Error uploading about image:', error); alert('Could not upload image.'); }
    };


    // --- SERVICES SECTION ---
    const renderServices = (services) => {
        servicesList.innerHTML = '';
        if (!services || services.length === 0) return;
        services.forEach(item => servicesList.appendChild(createItemCard(item, 'service')));
    };
    const loadServices = async () => {
        try {
            const response = await fetch(`${API_URL}/services`);
            const data = await response.json();
            renderServices(data);
        } catch(error) { console.error('Error loading services:', error); }
    };
    const handleServiceFormSubmit = async (e) => {
        e.preventDefault();
        const id = serviceIdInput.value;
        const formData = new FormData();
        formData.append('title', serviceTitleInput.value);
        formData.append('text', serviceTextInput.value);
        if (serviceImageInput.files[0]) {
            formData.append('image', serviceImageInput.files[0]);
        }

        const url = id ? `${API_URL}/services/${id}` : `${API_URL}/services`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: formData });
            if (!response.ok) throw new Error(`Failed to save service.`);
            alert(`Service saved successfully!`);
            serviceModal.hide();
            loadServices();
        } catch(error) { console.error('Error saving service:', error); alert('Could not save service.'); }
    };
    const openServiceModalForEdit = async (id) => {
        try {
            const response = await fetch(`${API_URL}/services/${id}`);
            const item = await response.json();
            serviceModalTitle.textContent = 'Edit Service';
            serviceIdInput.value = item.id;
            serviceTitleInput.value = item.title;
            serviceTextInput.value = item.text;
            serviceImageInput.value = '';
            serviceModal.show();
        } catch(error) { console.error('Error fetching service for edit:', error); }
    };
    
    // --- PACKAGES SECTION ---
    const renderPackages = (packages) => {
        packagesList.innerHTML = '';
        if (!packages || packages.length === 0) return;
        packages.forEach(item => packagesList.appendChild(createItemCard(item, 'package')));
    };
    const loadPackages = async () => {
        try {
            const response = await fetch(`${API_URL}/packages`);
            const data = await response.json();
            renderPackages(data);
        } catch(error) { console.error('Error loading packages:', error); }
    };
    const handlePackageFormSubmit = async (e) => {
        e.preventDefault();
        const id = packageIdInput.value;
        const formData = new FormData();
        formData.append('title', packageTitleInput.value);
        formData.append('text', packageTextInput.value);
        if (packageImageInput.files[0]) {
            formData.append('image', packageImageInput.files[0]);
        }

        const url = id ? `${API_URL}/packages/${id}` : `${API_URL}/packages`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method, body: formData });
            if (!response.ok) throw new Error(`Failed to save package.`);
            alert(`Package saved successfully!`);
            packageModal.hide();
            loadPackages();
        } catch(error) { console.error('Error saving package:', error); alert('Could not save package.'); }
    };
    const openPackageModalForEdit = async (id) => {
        try {
            const response = await fetch(`${API_URL}/packages/${id}`);
            const item = await response.json();
            packageModalTitle.textContent = 'Edit Package';
            packageIdInput.value = item.id;
            packageTitleInput.value = item.title;
            packageTextInput.value = item.text;
            packageImageInput.value = '';
            packageModal.show();
        } catch(error) { console.error('Error fetching package for edit:', error); }
    };

    // --- GALLERY SECTION ---
    const renderGalleryImages = (images) => {
        galleryList.innerHTML = '';
        if (!images || images.length === 0) {
            galleryList.innerHTML = '<p class="text-muted">No images found in gallery.</p>';
            return;
        }
        images.forEach(item => galleryList.appendChild(createItemCard(item, 'gallery')));
    };

    const loadGalleryData = async () => {
        try {
            const response = await fetch(`${API_URL}/gallery`);
            const data = await response.json();
            renderGalleryImages(data);
        } catch(error) { console.error('Error loading gallery:', error); }
    };

    const uploadGalleryImages = async (e) => {
        e.preventDefault();
        if (!galleryImageUpload.files.length) return alert('Please select one or more image files first.');
        
        const formData = new FormData();
        for (const file of galleryImageUpload.files) {
            formData.append('images', file);
        }

        try {
            const response = await fetch(`${API_URL}/gallery`, { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload images');
            }
            alert('Images uploaded successfully!');
            galleryImageForm.reset(); // Clear the file input
            loadGalleryData(); // Refresh the gallery
        } catch (error) {
            console.error('Error uploading gallery images:', error);
            alert(`Could not upload images. ${error.message}`);
        }
    };


    // --- GENERIC DELETE ---
    const handleDelete = async (id, section) => {
        if (!confirm(`Are you sure you want to delete this ${section} item?`)) return;
        
        let url;
        if (section === 'hero') url = `${API_URL}/hero/image/${id}`;
        else if (section === 'about') url = `${API_URL}/about/image/${id}`;
        else if (section === 'gallery') url = `${API_URL}/gallery/${id}`;
        else url = `${API_URL}/${section}s/${id}`;

        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Failed to delete item.`);
            alert('Item deleted successfully!');
            if (section === 'hero') loadHeroData();
            if (section === 'about') loadAboutData();
            if (section === 'service') loadServices();
            if (section === 'package') loadPackages();
            if (section === 'gallery') loadGalleryData();
        } catch (error) { console.error('Error deleting item:', error); alert('Could not delete item.'); }
    };


    // --- INITIALIZATION & EVENT LISTENERS ---
    const init = () => {
        // Modals
        serviceModal = new bootstrap.Modal(serviceModalEl);
        packageModal = new bootstrap.Modal(packageModalEl);
        
        // Initial Data Load
        loadHeroData();
        loadAboutData();
        loadServices();
        loadPackages();
        loadGalleryData();

        // Event Listeners
        heroForm.addEventListener('submit', saveHeroText);
        heroImageForm.addEventListener('submit', uploadHeroImage);
        
        aboutForm.addEventListener('submit', saveAboutText);
        aboutImageForm.addEventListener('submit', uploadAboutImage);

        serviceForm.addEventListener('submit', handleServiceFormSubmit);
        packageForm.addEventListener('submit', handlePackageFormSubmit);

        galleryImageForm.addEventListener('submit', uploadGalleryImages);
        
        addServiceBtn.addEventListener('click', () => {
            serviceModalTitle.textContent = 'Add New Service';
            serviceForm.reset();
            serviceIdInput.value = '';
        });
        addPackageBtn.addEventListener('click', () => {
            packageModalTitle.textContent = 'Add New Package';
            packageForm.reset();
            packageIdInput.value = '';
        });

        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('.delete-btn')) {
                handleDelete(target.dataset.id, target.dataset.section);
            }
            if (target.matches('.edit-btn')) {
                if (target.dataset.section === 'service') openServiceModalForEdit(target.dataset.id);
                if (target.dataset.section === 'package') openPackageModalForEdit(target.dataset.id);
            }
        });
    };

    init();
});