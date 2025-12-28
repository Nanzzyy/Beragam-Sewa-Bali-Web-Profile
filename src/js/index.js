// Fungsi untuk mengisi konten dinamis dan menginisialisasi library
async function initializePage() {
    try {
        const response = await fetch('http://localhost:3000/api/content');
        if (!response.ok) {
            throw new Error(`Gagal mengambil data: ${response.statusText}`);
        }
        const data = await response.json();

        // 1. Mengisi konten teks
        document.getElementById('home_title').textContent = data.home_title || '';
        document.getElementById('home_subtitle').innerHTML = data.home_subtitle || ''; // Gunakan innerHTML jika teks mengandung <br>
        document.getElementById('about_title').textContent = data.about_title || '';
        document.getElementById('about_text').innerHTML = data.about_text || '';
        // Ganti judul statis menjadi dinamis jika ada di database
        const servicesTitle = document.getElementById('services_title');
        if (servicesTitle && data.services_title) {
            servicesTitle.textContent = data.services_title;
        }
        const packagesTitle = document.getElementById('packages_title');
        if (packagesTitle && data.packages_title) {
            packagesTitle.textContent = data.packages_title;
        }


        // 2. Mengisi Home Swiper
        const homeSwiperWrapper = document.getElementById('home-swiper-wrapper');
        if (homeSwiperWrapper && data.home_slider) {
            homeSwiperWrapper.innerHTML = '';
            data.home_slider.forEach(slide => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.style.backgroundImage = `url('${slide.image_url}')`;
                homeSwiperWrapper.appendChild(slideEl);
            });
             // Inisialisasi Swiper setelah DOM diisi
            new Swiper('.heroSwiper', {
                slidesPerView: 1, loop: true, autoplay: { delay: 5000 }, pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
            });
        }

        // 3. Mengisi About Carousel (Bootstrap)
        const aboutCarouselInner = document.getElementById('about-carousel-inner');
        if (aboutCarouselInner && data.about_carousel) {
            aboutCarouselInner.innerHTML = '';
            data.about_carousel.forEach((item, index) => {
                const carouselItem = document.createElement('div');
                carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                carouselItem.innerHTML = `<img src="${item.image_url}" class="d-block w-100" alt="${item.caption || ''}">`;
                aboutCarouselInner.appendChild(carouselItem);
            });
            // Re-initialize Bootstrap carousel if needed, though data-bs-ride usually handles it.
        }

        // 4. Mengisi Packages Swiper (Asumsi ada data 'packages' dari API)
        const packagesSwiperWrapper = document.getElementById('packages-swiper-wrapper');
        if (packagesSwiperWrapper && data.packages) {
            packagesSwiperWrapper.innerHTML = '';
            data.packages.forEach(pkg => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.innerHTML = `
                    <div class="card shadow-sm">
                        <img src="${pkg.image_url || 'https://picsum.photos/seed/placeholder/600/400'}" class="card-img-top" alt="${pkg.name}">
                        <div class="card-body">
                            <h5 class="card-title">${pkg.name}</h5>
                            <p class="card-text">${pkg.description}</p>
                            <a href="#" class="btn btn-outline-dark">Details</a>
                        </div>
                    </div>
                `;
                packagesSwiperWrapper.appendChild(slideEl);
            });
        }
        
        // 5. Mengisi Services Swiper (Asumsi ada data 'services' dari API)
        const servicesSwiperWrapper = document.getElementById('services-swiper-wrapper');
        if (servicesSwiperWrapper && data.services) { // Anda perlu menambahkan 'services' ke API Anda
            servicesSwiperWrapper.innerHTML = '';
            data.services.forEach(srv => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.innerHTML = `
                    <div class="card shadow-sm">
                        <img src="${srv.image_url || 'https://picsum.photos/seed/placeholder/600/400'}" class="card-img-top" alt="${srv.name}">
                        <div class="card-body">
                            <h5 class="card-title">${srv.name}</h5>
                            <p class="card-text">${srv.description}</p>
                            <a href="#" class="btn btn-outline-dark">Details</a>
                        </div>
    
                    </div>
                `;
                servicesSwiperWrapper.appendChild(slideEl);
            });
        }

        // Inisialisasi swiper untuk Service dan Package setelah DOM diisi
        new Swiper('.mySwiper', {
            slidesPerView: 3,
            spaceBetween: 10,
            loop: true,
            autoplay: { delay: 3000, disableOnInteraction: false },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            pagination: { el: '.swiper-pagination', clickable: true },
            breakpoints: { 0: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 992: { slidesPerView: 3 } }
        });


        // 6. Mengisi Main Gallery Swiper
        const mainGallerySwiperWrapper = document.getElementById('main-gallery-swiper-wrapper');
        if (mainGallerySwiperWrapper && data.main_gallery) {
            mainGallerySwiperWrapper.innerHTML = '';
            data.main_gallery.forEach(img => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.innerHTML = `
                    <div class="card shadow-sm">
                        <img src="${img.image_url}" class="card-img-top" alt="${img.caption || ''}">
                    </div>
                `;
                mainGallerySwiperWrapper.appendChild(slideEl);
            });
             // Inisialisasi Swiper setelah DOM diisi
            new Swiper('.GallerySwiper', {
                slidesPerView: 5,
                spaceBetween: 20,
                loop: true,
                autoplay: { delay: 2000, disableOnInteraction: false },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                pagination: { el: '.swiper-pagination', clickable: true },
                breakpoints: { 0: { slidesPerView: 2 }, 640: { slidesPerView: 4 }, 992: { slidesPerView: 5 } }
            });
        }

    } catch (error) {
        console.error("Gagal menginisialisasi halaman:", error);
    }
}

// Panggil fungsi utama saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', initializePage);
