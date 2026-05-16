// common.js - Global features: Dark Mode & Language Translation

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ---- Hybrid Translation Strategy ----

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return null;
}

function initLanguage() {
    const savedLang = localStorage.getItem('lang') || 'id';
    applyLanguage(savedLang, false); // false = don't reload
}

function toggleLanguage(lang) {
    localStorage.setItem('lang', lang);
    
    // Set Google Translate Cookie
    const hostname = window.location.hostname;
    const isLocal = !hostname || hostname === 'localhost' || hostname === '127.0.0.1';

    if (lang === 'id') {
        // Clear all possible googtrans cookies
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        if (!isLocal) {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname}`;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname}`;
        }
    } else {
        // Set googtrans cookie
        document.cookie = `googtrans=/id/${lang}; path=/`;
        if (!isLocal) {
            document.cookie = `googtrans=/id/${lang}; path=/; domain=${hostname}`;
            document.cookie = `googtrans=/id/${lang}; path=/; domain=.${hostname}`;
        }
    }

    // Apply manual translations first
    applyLanguage(lang, true);
}

function applyLanguage(lang, shouldReload) {
    const trans = window.translations ? window.translations[lang] : null;
    
    // 1. Manual UI Translation (Fastest)
    if (trans) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (trans[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = trans[key];
                } else {
                    el.textContent = trans[key];
                }
            }
        });
    }

    document.documentElement.lang = lang;
    
    // Update flag active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. Dynamic Content Translation (via Google Engine)
    // We reload to let Google Translate pick up the dynamic text like "About"
    if (shouldReload) {
        window.location.reload();
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();

    // Setup Theme Toggle Listeners
    const themeToggles = document.querySelectorAll('.theme-toggle-btn');
    themeToggles.forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    // Setup Language Toggle Listeners
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleLanguage(btn.getAttribute('data-lang'));
        });
    });
});

// Expose for dynamic content
window.applyLanguage = applyLanguage;
