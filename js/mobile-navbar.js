// Mobile Navbar Functionality
// Este script deve ser incluído em todas as páginas que usam o dashboard

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const mobileRefreshBtn = document.getElementById('mobile-refresh-btn');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (!mobileMenuToggle || !sidebar || !mobileOverlay) {
            console.warn('⚠️ Elementos da navbar mobile não encontrados');
            return;
        }

        // Toggle mobile menu
        function toggleMobileMenu() {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Change icon
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('mobile-open')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        }

        // Close mobile menu
        function closeMobileMenu() {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }

        // Event listeners
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        mobileOverlay.addEventListener('click', closeMobileMenu);

        // Mobile button functionality
        if (mobileRefreshBtn && refreshBtn) {
            mobileRefreshBtn.addEventListener('click', function() {
                refreshBtn.click();
                closeMobileMenu();
            });
        }

        if (mobileLogoutBtn && logoutBtn) {
            mobileLogoutBtn.addEventListener('click', function() {
                logoutBtn.click();
                closeMobileMenu();
            });
        }

        // Fechar menu ao clicar em um link do sidebar
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Pequeno delay para permitir navegação
                setTimeout(closeMobileMenu, 100);
            });
        });

        // Fechar menu ao redimensionar a janela (se voltar para desktop)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });
    });
})();



