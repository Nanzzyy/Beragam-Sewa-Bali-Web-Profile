// Fungsi untuk mengisi konten dinamis dan menginisialisasi library
async function initializePage() {
    try {
        const API_BASE = '/api';
            
        let data;
        try {
            if (window.__CONTENT_PROMISE__) {
                data = await window.__CONTENT_PROMISE__;
            } else {
                const response = await fetch(`${API_BASE}/content`);
                if (!response.ok) throw new Error(`Gagal mengambil data: ${response.statusText}`);
                data = await response.json();
            }
            localStorage.setItem('bsb_content_cache', JSON.stringify(data));
        } catch (fetchError) {
            console.warn("Failed to fetch fresh content, trying cache...", fetchError);
            const cached = localStorage.getItem('bsb_content_cache');
            if (cached) {
                data = JSON.parse(cached);
            } else {
                throw fetchError;
            }
        }

        const protectBrand = (text) => {
            if (!text) return '';
            // Case-insensitive replace for brand name to wrap it in notranslate span
            return text.replace(/Beragam Sewa Bali/gi, '<span class="notranslate">$&</span>');
        };

        // 1. Mengisi konten teks
        document.getElementById('home_title').innerHTML = protectBrand(data.home_title) || '';
        document.getElementById('home_subtitle').innerHTML = data.home_subtitle ? protectBrand(data.home_subtitle).replace(/\n/g, '<br>') : '';
        document.getElementById('about_title').innerHTML = protectBrand(data.about_title) || '';
        document.getElementById('about_text').innerHTML = data.about_text ? protectBrand(data.about_text).replace(/\n/g, '<br>') : '';
        
        // Site Logo
        if (data.site_logo) {
            const navLogo = document.getElementById('nav-logo');
            const footerLogo = document.getElementById('footer-logo');
            const favicon = document.getElementById('favicon');
            if (navLogo) navLogo.src = data.site_logo;
            if (footerLogo) footerLogo.src = data.site_logo;
            if (favicon) {
                // Tambahkan cache buster (?t=...) agar browser selalu mengambil yang terbaru
                favicon.href = data.site_logo + '?t=' + new Date().getTime();
            }
        }

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
            data.home_slider.forEach((slide, index) => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.innerHTML = `<img src="${slide.image_url}" class="hero-slide-bg w-full h-full object-cover" alt="Hero Image" decoding="async">`;
                homeSwiperWrapper.appendChild(slideEl);
                
                // Preload LCP image (first slide)
                if (index === 0) {
                    const preload = document.createElement('link');
                    preload.rel = 'preload';
                    preload.as = 'image';
                    preload.href = slide.image_url;
                    document.head.appendChild(preload);
                }
            });

            new Swiper('.heroSwiper', {
                slidesPerView: 1,
                effect: 'fade',
                fadeEffect: { crossFade: true },
                loop: data.home_slider.length > 1,
                speed: 1200,
                observer: true,
                observeParents: true,
                autoplay: {
                    delay: 6000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: false
                },
                pagination: {
                    el: '#home .swiper-pagination',
                    clickable: true
                }
            });
        }

        // 3. Mengisi About Carousel
        const aboutSwiperWrapper = document.getElementById('about-swiper-wrapper');
        if (aboutSwiperWrapper && data.about_carousel) {
            aboutSwiperWrapper.innerHTML = '';
            data.about_carousel.forEach((item) => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide h-full';
                slideEl.innerHTML = `<img src="${item.image_url}" width="400" height="500" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${item.caption || ''}">`;
                aboutSwiperWrapper.appendChild(slideEl);
            });

            new Swiper('.aboutSwiper', {
                slidesPerView: 1,
                loop: true,
                speed: 800,
                observer: true,
                observeParents: true,
                autoplay: { delay: 4000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true }
            });
        }

        // 4. Render Cards (Services & Packages)
        const renderCards = (wrapperId, items, type) => {
            const wrapper = document.getElementById(wrapperId);
            if (!wrapper || !items) return;
            wrapper.innerHTML = '';
            items.forEach(item => {
                const slideEl = document.createElement('div');
                slideEl.className = 'swiper-slide';
                slideEl.innerHTML = `
                    <div class="flex justify-center pb-12 w-full">
                        <div class="w-full max-w-[340px] bg-white rounded-3xl overflow-hidden border border-black/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group mx-auto">
                            <div class="relative overflow-hidden h-[240px]">
                                <img src="${item.image_url || 'https://picsum.photos/seed/placeholder/600/400'}" 
                                     width="340" height="240" loading="lazy" decoding="async"
                                     class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                     alt="${item.name || ''}">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </div>
                            <div class="p-8">
                                <h5 class="text-xl font-bold text-brand-dark mb-3 group-hover:text-brand-red transition-colors">${item.name || ''}</h5>
                                <p class="text-sm text-text-muted leading-relaxed mb-8 line-clamp-2">${item.description || ''}</p>
                                <a href="detail.html?type=${type}&id=${item.id}&source=home" 
                                   class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-red group/btn">
                                    <span data-i18n="btn_details">Details Explore</span>
                                    <i class="fa-solid fa-arrow-right-long transition-transform group-hover/btn:translate-x-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                wrapper.appendChild(slideEl);
            });
        };

        renderCards('services-swiper-wrapper', data.services, 'service');
        renderCards('packages-swiper-wrapper', data.packages, 'package');

        // Apply translations to dynamic content
        if (typeof applyLanguage === 'function') {
            applyLanguage(localStorage.getItem('lang') || 'id');
        }

        // Init swiper for Service dan Package
        const commonSwiperConfig = (containerId, itemCount) => ({
            slidesPerView: 3,
            spaceBetween: 30,
            loop: itemCount >= 3,
            grabCursor: true,
            roundLengths: true,
            watchSlidesProgress: true,
            observer: true,
            observeParents: true,
            autoplay: { delay: 4000, disableOnInteraction: false },
            navigation: {
                nextEl: `${containerId} .swiper-button-next`,
                prevEl: `${containerId} .swiper-button-prev`
            },
            pagination: { el: `${containerId} .swiper-pagination`, clickable: true },
            breakpoints: {
                0: { slidesPerView: 1, spaceBetween: 20 },
                768: { slidesPerView: 2, spaceBetween: 25 },
                1024: { slidesPerView: 3, spaceBetween: 30 }
            }
        });

        if (data.services && data.services.length > 0) {
            new Swiper('#service .mySwiper', commonSwiperConfig('#service', data.services.length));
        }
        if (data.packages && data.packages.length > 0) {
            new Swiper('#package .mySwiper', commonSwiperConfig('#package', data.packages.length));
        }


        // 5. Gallery Swiper
        const mainGallerySwiperWrapper = document.getElementById('main-gallery-swiper-wrapper');
        try {
            let galleryData;
            try {
                if (window.__GALLERY_PROMISE__) {
                    galleryData = await window.__GALLERY_PROMISE__;
                } else {
                    const API_BASE = '/api';
                    const galleryResponse = await fetch(`${API_BASE}/gallery`);
                    if (!galleryResponse.ok) throw new Error('Failed to fetch gallery');
                    galleryData = await galleryResponse.json();
                }
                localStorage.setItem('bsb_gallery_cache', JSON.stringify(galleryData));
            } catch (galleryError) {
                console.warn("Failed to fetch fresh gallery, trying cache...", galleryError);
                const cachedGallery = localStorage.getItem('bsb_gallery_cache');
                if (cachedGallery) {
                    galleryData = JSON.parse(cachedGallery);
                } else {
                    throw galleryError;
                }
            }

            if (mainGallerySwiperWrapper && galleryData) {
                mainGallerySwiperWrapper.innerHTML = '';
                galleryData.forEach(img => {
                    const slideEl = document.createElement('div');
                    slideEl.className = 'swiper-slide';
                    slideEl.innerHTML = `
                        <div class="group relative aspect-square shadow-sm rounded-2xl overflow-hidden bg-bg-surface hover:-translate-y-2 hover:shadow-2xl transition-all duration-500">
                            <img src="${img.image_url}" width="300" height="300" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt="${img.caption || ''}">
                            <div class="absolute inset-0 bg-brand-red opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
                        </div>
                    `;
                    mainGallerySwiperWrapper.appendChild(slideEl);
                });

                new Swiper('.GallerySwiper', {
                    slidesPerView: 5,
                    spaceBetween: 20,
                    loop: true,
                    speed: 600,
                    observer: true,
                    observeParents: true,
                    autoplay: { delay: 2500, disableOnInteraction: false },
                    breakpoints: {
                        0: { slidesPerView: 2, spaceBetween: 15 },
                        640: { slidesPerView: 3, spaceBetween: 20 },
                        1024: { slidesPerView: 5, spaceBetween: 20 }
                    }
                });
            }
        } catch (error) {
            console.error('Gallery failed to load');
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        
        const protectBrand = (text) => {
            if (!text) return '';
            return text.replace(/Beragam Sewa Bali/gi, '<span class="notranslate">$&</span>');
        };

        // Fallback UI rendering
        document.getElementById('home_title').innerHTML = protectBrand('Beragam Sewa Bali');
        document.getElementById('home_subtitle').innerHTML = 'Solusi Sewa Perlengkapan Event Terpercaya di Bali';
        document.getElementById('about_title').innerHTML = protectBrand('Tentang Beragam Sewa Bali');
        document.getElementById('about_text').innerHTML = 'Beragam Sewa Bali adalah penyedia jasa sewa perlengkapan event terpercaya di Bali. Kami siap melayani kebutuhan sound system, lighting, multimedia, tenda, panggung, dan perlengkapan lainnya untuk mensukseskan acara Anda.';
        
        const homeSwiperWrapper = document.getElementById('home-swiper-wrapper');
        if (homeSwiperWrapper) {
            homeSwiperWrapper.innerHTML = `
                <div class="swiper-slide">
                    <div class="hero-slide-bg bg-black/60 flex items-center justify-center text-white/50">
                        <span>Offline Mode - Silakan hubungi kami via WhatsApp</span>
                    </div>
                </div>
            `;
        }
        
        const servicesWrapper = document.getElementById('services-swiper-wrapper');
        if (servicesWrapper) {
            servicesWrapper.innerHTML = `
                <div class="text-center py-8 text-text-muted w-full">
                    <p data-i18n="offline_services">Layanan sementara tidak dapat dimuat. Silakan periksa koneksi Anda.</p>
                </div>
            `;
        }
        const packagesWrapper = document.getElementById('packages-swiper-wrapper');
        if (packagesWrapper) {
            packagesWrapper.innerHTML = `
                <div class="text-center py-8 text-text-muted w-full">
                    <p data-i18n="offline_packages">Paket sementara tidak dapat dimuat. Silakan periksa koneksi Anda.</p>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();

    // ── Navbar scroll effect ──────────────────────────────
    const navbar = document.getElementById('mainNavbar');
    const onScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();


    // ── Mobile Menu ──────────────────────────────
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileMenuBtn = document.getElementById('closeMobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const mobileMenuSidebar = document.getElementById('mobileMenuSidebar');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    const openMobileMenu = () => {
        mobileMenu.classList.remove('invisible');
        setTimeout(() => {
            mobileMenuBackdrop.classList.replace('opacity-0', 'opacity-100');
            mobileMenuSidebar.classList.replace('translate-x-full', 'translate-x-0');
        }, 10);
    };

    const closeMobileMenu = () => {
        mobileMenuBackdrop.classList.replace('opacity-100', 'opacity-0');
        mobileMenuSidebar.classList.replace('translate-x-0', 'translate-x-full');
        setTimeout(() => mobileMenu.classList.add('invisible'), 300);
    };

    mobileMenuBtn?.addEventListener('click', openMobileMenu);
    closeMobileMenuBtn?.addEventListener('click', closeMobileMenu);
    mobileMenuBackdrop?.addEventListener('click', closeMobileMenu);
    mobileNavLinks.forEach(link => link.addEventListener('click', closeMobileMenu));

    // ── Scroll Reveal ─────────────
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});

