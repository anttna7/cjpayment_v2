/**
 * Navigation Component System
 * Modern navigation with responsive design, accessibility, and search functionality
 */

class NavigationComponent {
    constructor(options = {}) {
        this.options = {
            mobileBreakpoint: 768,
            searchDelay: 300,
            searchMinLength: 2,
            ...options
        };
        
        this.elements = {};
        this.state = {
            isMobileMenuOpen: false,
            isUserMenuOpen: false,
            isSearchOpen: false,
            isSidebarOpen: false,
            currentRoute: '',
            searchQuery: '',
            searchResults: [],
            expandedSidebarItems: new Set(),
            breadcrumbHistory: []
        };
        
        this.searchTimeout = null;
        this.resizeTimeout = null;
        
        this.init();
    }
    
    init() {
        this.bindElements();
        this.bindEvents();
        this.setActiveRoute();
        this.handleResize();
        
        // Initialize accessibility features
        this.initAccessibility();
        
        console.log('Navigation component initialized');
    }
    
    bindElements() {
        this.elements = {
            navbar: document.querySelector('.navbar'),
            mobileToggle: document.querySelector('.navbar__mobile-toggle'),
            nav: document.querySelector('.navbar__nav'),
            navLinks: document.querySelectorAll('.nav__link'),
            userMenuTrigger: document.querySelector('.user-menu__trigger'),
            userMenu: document.querySelector('.user-menu'),
            userDropdown: document.querySelector('.user-menu__dropdown'),
            searchInput: document.querySelector('.search__input'),
            searchResults: document.querySelector('.search__results'),
            breadcrumb: document.querySelector('.breadcrumb'),
            sidebar: document.querySelector('.sidebar'),
            sidebarToggle: document.querySelector('.sidebar-toggle'),
            sidebarBackdrop: document.querySelector('.sidebar-backdrop'),
            sidebarNavLinks: document.querySelectorAll('.sidebar__nav-link'),
            contentArea: document.querySelector('.content-with-sidebar')
        };
    }
    
    bindEvents() {
        // Mobile menu toggle
        if (this.elements.mobileToggle) {
            this.elements.mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }
        
        // User menu toggle
        if (this.elements.userMenuTrigger) {
            this.elements.userMenuTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleUserMenu();
            });
        }
        
        // Navigation links
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleNavClick(e, link);
            });
        });
        
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e);
            });
            
            this.elements.searchInput.addEventListener('focus', () => {
                this.showSearchResults();
            });
            
            this.elements.searchInput.addEventListener('keydown', (e) => {
                this.handleSearchKeydown(e);
            });
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });
        
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 100);
        });
        
        // Handle scroll for navbar elevation
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
        
        // Sidebar toggle
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSidebar();
            });
        }
        
        // Sidebar backdrop
        if (this.elements.sidebarBackdrop) {
            this.elements.sidebarBackdrop.addEventListener('click', () => {
                this.closeSidebar();
            });
        }
        
        // Sidebar navigation links
        this.elements.sidebarNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleSidebarNavClick(e, link);
            });
        });
        
        // Breadcrumb actions
        this.initBreadcrumbActions();
    }
    
    initAccessibility() {
        // Add ARIA attributes
        if (this.elements.mobileToggle) {
            this.elements.mobileToggle.setAttribute('aria-expanded', 'false');
            this.elements.mobileToggle.setAttribute('aria-controls', 'navbar-nav');
            this.elements.mobileToggle.setAttribute('aria-label', '切换导航菜单');
        }
        
        if (this.elements.nav) {
            this.elements.nav.setAttribute('id', 'navbar-nav');
        }
        
        if (this.elements.userMenuTrigger) {
            this.elements.userMenuTrigger.setAttribute('aria-expanded', 'false');
            this.elements.userMenuTrigger.setAttribute('aria-haspopup', 'true');
            this.elements.userMenuTrigger.setAttribute('aria-controls', 'user-dropdown');
        }
        
        if (this.elements.userDropdown) {
            this.elements.userDropdown.setAttribute('id', 'user-dropdown');
            this.elements.userDropdown.setAttribute('role', 'menu');
        }
        
        // Add keyboard navigation support
        this.initKeyboardNavigation();
    }
    
    initKeyboardNavigation() {
        // Handle keyboard navigation in dropdowns
        if (this.elements.userDropdown) {
            const menuItems = this.elements.userDropdown.querySelectorAll('.user-menu__item');
            
            menuItems.forEach((item, index) => {
                item.setAttribute('role', 'menuitem');
                item.setAttribute('tabindex', '-1');
                
                item.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            const nextItem = menuItems[index + 1] || menuItems[0];
                            nextItem.focus();
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            const prevItem = menuItems[index - 1] || menuItems[menuItems.length - 1];
                            prevItem.focus();
                            break;
                        case 'Enter':
                        case ' ':
                            e.preventDefault();
                            item.click();
                            break;
                    }
                });
            });
        }
    }
    
    toggleMobileMenu() {
        this.state.isMobileMenuOpen = !this.state.isMobileMenuOpen;
        
        if (this.elements.mobileToggle) {
            this.elements.mobileToggle.classList.toggle('active', this.state.isMobileMenuOpen);
            this.elements.mobileToggle.setAttribute('aria-expanded', this.state.isMobileMenuOpen.toString());
        }
        
        if (this.elements.nav) {
            this.elements.nav.classList.toggle('show', this.state.isMobileMenuOpen);
        }
        
        // Prevent body scroll when mobile menu is open
        document.body.style.overflow = this.state.isMobileMenuOpen ? 'hidden' : '';
        
        // Focus management
        if (this.state.isMobileMenuOpen) {
            const firstNavLink = this.elements.nav.querySelector('.nav__link');
            if (firstNavLink) {
                setTimeout(() => firstNavLink.focus(), 100);
            }
        }
        
        this.emit('mobileMenuToggle', { isOpen: this.state.isMobileMenuOpen });
    }
    
    toggleUserMenu() {
        this.state.isUserMenuOpen = !this.state.isUserMenuOpen;
        
        if (this.elements.userMenu) {
            this.elements.userMenu.classList.toggle('open', this.state.isUserMenuOpen);
        }
        
        if (this.elements.userMenuTrigger) {
            this.elements.userMenuTrigger.classList.toggle('active', this.state.isUserMenuOpen);
            this.elements.userMenuTrigger.setAttribute('aria-expanded', this.state.isUserMenuOpen.toString());
        }
        
        // Focus management
        if (this.state.isUserMenuOpen) {
            const firstMenuItem = this.elements.userDropdown?.querySelector('.user-menu__item');
            if (firstMenuItem) {
                setTimeout(() => {
                    firstMenuItem.setAttribute('tabindex', '0');
                    firstMenuItem.focus();
                }, 100);
            }
        } else {
            // Reset tabindex for all menu items
            const menuItems = this.elements.userDropdown?.querySelectorAll('.user-menu__item');
            menuItems?.forEach(item => item.setAttribute('tabindex', '-1'));
        }
        
        this.emit('userMenuToggle', { isOpen: this.state.isUserMenuOpen });
    }
    
    handleNavClick(e, link) {
        const route = link.getAttribute('data-route');
        const href = link.getAttribute('href');
        
        // Update active state
        this.setActiveRoute(route);
        
        // Close mobile menu if open
        if (this.state.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
        
        // Emit navigation event
        this.emit('navigate', { route, href, link });
        
        // If using client-side routing, prevent default
        if (window.CJPaymentApp?.router) {
            e.preventDefault();
            window.CJPaymentApp.router.navigate(href);
        }
    }
    
    setActiveRoute(route = null) {
        if (!route) {
            // Auto-detect current route from URL
            const path = window.location.pathname;
            route = path.split('/')[1] || 'dashboard';
        }
        
        this.state.currentRoute = route;
        
        // Update active states
        this.elements.navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            link.classList.toggle('active', linkRoute === route);
        });
        
        // Update breadcrumb if needed
        this.updateBreadcrumb(route);
        
        this.emit('routeChange', { route });
    }
    
    updateBreadcrumb(route) {
        if (!this.elements.breadcrumb) return;
        
        const breadcrumbData = this.getBreadcrumbData(route);
        if (breadcrumbData.length === 0) return;
        
        const breadcrumbList = this.elements.breadcrumb.querySelector('.breadcrumb__list') || 
                              this.elements.breadcrumb.querySelector('ol') ||
                              this.elements.breadcrumb;
        
        breadcrumbList.innerHTML = breadcrumbData.map((item, index) => {
            const isLast = index === breadcrumbData.length - 1;
            return `
                <li class="breadcrumb__item">
                    ${item.icon ? `<span class="breadcrumb__icon">${item.icon}</span>` : ''}
                    ${isLast ? 
                        `<span class="breadcrumb__current">${item.title}</span>` :
                        `<a href="${item.url}" class="breadcrumb__link">${item.title}</a>`
                    }
                </li>
            `;
        }).join('');
    }
    
    getBreadcrumbData(route) {
        const breadcrumbs = {
            dashboard: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '仪表板', url: '/dashboard', icon: '📊' }
            ],
            recharge: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '充值管理', url: '/recharge', icon: '💰' }
            ],
            merchants: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '商户管理', url: '/merchants', icon: '🏢' }
            ],
            accounts: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '账户管理', url: '/accounts', icon: '🏦' }
            ],
            reports: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '数据报表', url: '/reports', icon: '📈' }
            ],
            settings: [
                { title: '首页', url: '/', icon: '🏠' },
                { title: '系统设置', url: '/settings', icon: '⚙️' }
            ]
        };
        
        return breadcrumbs[route] || [];
    }
    
    handleSearchInput(e) {
        const query = e.target.value.trim();
        this.state.searchQuery = query;
        
        clearTimeout(this.searchTimeout);
        
        if (query.length >= this.options.searchMinLength) {
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, this.options.searchDelay);
        } else {
            this.hideSearchResults();
        }
    }
    
    handleSearchKeydown(e) {
        const results = this.elements.searchResults?.querySelectorAll('.search__result-item');
        if (!results || results.length === 0) return;
        
        const currentFocus = document.activeElement;
        const currentIndex = Array.from(results).indexOf(currentFocus);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
                results[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
                results[prevIndex].focus();
                break;
            case 'Enter':
                if (currentFocus && currentFocus.classList.contains('search__result-item')) {
                    currentFocus.click();
                }
                break;
        }
    }
    
    async performSearch(query) {
        try {
            // Show loading state
            this.showSearchLoading();
            
            // Simulate API call - replace with actual search endpoint
            const results = await this.searchAPI(query);
            
            this.state.searchResults = results;
            this.renderSearchResults(results);
            this.showSearchResults();
            
            this.emit('searchComplete', { query, results });
        } catch (error) {
            console.error('Search error:', error);
            this.showSearchError();
        }
    }
    
    async searchAPI(query) {
        // Mock search results - replace with actual API call
        return new Promise(resolve => {
            setTimeout(() => {
                const mockResults = [
                    { id: 1, title: '仪表板', description: '查看系统概览和统计信息', url: '/dashboard', icon: '📊' },
                    { id: 2, title: '充值订单', description: '管理充值订单和交易记录', url: '/recharge/orders', icon: '💰' },
                    { id: 3, title: '商户列表', description: '查看和管理商户信息', url: '/merchants', icon: '🏢' },
                    { id: 4, title: '账户设置', description: '管理收款账户配置', url: '/accounts', icon: '🏦' },
                    { id: 5, title: '数据报表', description: '查看详细的数据分析报表', url: '/reports', icon: '📈' }
                ].filter(item => 
                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.description.toLowerCase().includes(query.toLowerCase())
                );
                
                resolve(mockResults);
            }, 200);
        });
    }
    
    renderSearchResults(results) {
        if (!this.elements.searchResults) return;
        
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="search__no-results">
                    <p>未找到相关结果</p>
                </div>
            `;
            return;
        }
        
        this.elements.searchResults.innerHTML = results.map(result => `
            <a href="${result.url}" class="search__result-item" data-result-id="${result.id}">
                <div class="search__result-icon">${result.icon}</div>
                <div class="search__result-content">
                    <h4>${this.highlightSearchTerm(result.title, this.state.searchQuery)}</h4>
                    <p>${this.highlightSearchTerm(result.description, this.state.searchQuery)}</p>
                </div>
            </a>
        `).join('');
        
        // Add click handlers to search results
        this.elements.searchResults.querySelectorAll('.search__result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleSearchResultClick(e, item);
            });
        });
    }
    
    highlightSearchTerm(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    handleSearchResultClick(e, item) {
        const url = item.getAttribute('href');
        const resultId = item.getAttribute('data-result-id');
        
        this.hideSearchResults();
        this.elements.searchInput.blur();
        
        this.emit('searchResultClick', { url, resultId });
        
        // If using client-side routing
        if (window.CJPaymentApp?.router) {
            e.preventDefault();
            window.CJPaymentApp.router.navigate(url);
        }
    }
    
    showSearchResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.classList.add('show');
            this.state.isSearchOpen = true;
        }
    }
    
    hideSearchResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.classList.remove('show');
            this.state.isSearchOpen = false;
        }
    }
    
    showSearchLoading() {
        if (this.elements.searchResults) {
            this.elements.searchResults.innerHTML = `
                <div class="search__loading">
                    <div class="loading-spinner"></div>
                    <p>搜索中...</p>
                </div>
            `;
            this.showSearchResults();
        }
    }
    
    showSearchError() {
        if (this.elements.searchResults) {
            this.elements.searchResults.innerHTML = `
                <div class="search__error">
                    <p>搜索出错，请稍后重试</p>
                </div>
            `;
            this.showSearchResults();
        }
    }
    
    handleOutsideClick(e) {
        // Close user menu if clicking outside
        if (this.state.isUserMenuOpen && 
            this.elements.userMenu && 
            !this.elements.userMenu.contains(e.target)) {
            this.toggleUserMenu();
        }
        
        // Close search results if clicking outside
        if (this.state.isSearchOpen && 
            this.elements.searchInput && 
            !this.elements.searchInput.closest('.navbar__search')?.contains(e.target)) {
            this.hideSearchResults();
        }
    }
    
    closeAllDropdowns() {
        if (this.state.isUserMenuOpen) {
            this.toggleUserMenu();
        }
        
        if (this.state.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
        
        if (this.state.isSearchOpen) {
            this.hideSearchResults();
        }
        
        if (this.state.isSidebarOpen && window.innerWidth <= 1024) {
            this.closeSidebar();
        }
        
        // Close breadcrumb dropdowns
        document.querySelectorAll('.breadcrumb__dropdown.open').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
    
    handleResize() {
        const isMobile = window.innerWidth <= this.options.mobileBreakpoint;
        
        // Close mobile menu if switching to desktop
        if (!isMobile && this.state.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
        
        this.emit('resize', { isMobile, width: window.innerWidth });
    }
    
    handleScroll() {
        const scrollY = window.scrollY;
        const threshold = 10;
        
        if (this.elements.navbar) {
            this.elements.navbar.classList.toggle('navbar--elevated', scrollY > threshold);
        }
        
        this.emit('scroll', { scrollY, isElevated: scrollY > threshold });
    }
    
    // Notification badge management
    updateNotificationBadge(linkRoute, count) {
        const navLink = document.querySelector(`[data-route="${linkRoute}"]`);
        if (!navLink) return;
        
        let badge = navLink.querySelector('.nav__badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav__badge';
                navLink.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.setAttribute('aria-label', `${count} 条未读通知`);
        } else if (badge) {
            badge.remove();
        }
    }
    
    // Sidebar functionality
    toggleSidebar() {
        this.state.isSidebarOpen = !this.state.isSidebarOpen;
        
        if (this.elements.sidebar) {
            this.elements.sidebar.classList.toggle('open', this.state.isSidebarOpen);
        }
        
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.classList.toggle('active', this.state.isSidebarOpen);
        }
        
        if (this.elements.sidebarBackdrop) {
            this.elements.sidebarBackdrop.classList.toggle('show', this.state.isSidebarOpen);
        }
        
        if (this.elements.contentArea) {
            this.elements.contentArea.classList.toggle('sidebar-open', this.state.isSidebarOpen);
        }
        
        // Prevent body scroll when sidebar is open on mobile
        if (window.innerWidth <= 1024) {
            document.body.style.overflow = this.state.isSidebarOpen ? 'hidden' : '';
        }
        
        this.emit('sidebarToggle', { isOpen: this.state.isSidebarOpen });
    }
    
    closeSidebar() {
        if (this.state.isSidebarOpen) {
            this.toggleSidebar();
        }
    }
    
    handleSidebarNavClick(e, link) {
        const hasSubmenu = link.querySelector('.sidebar__nav-arrow');
        const parentItem = link.closest('.sidebar__nav-item');
        const itemId = link.getAttribute('data-item-id') || link.getAttribute('href');
        
        if (hasSubmenu) {
            e.preventDefault();
            this.toggleSidebarSubmenu(parentItem, itemId);
        } else {
            // Handle regular navigation
            const route = link.getAttribute('data-route');
            const href = link.getAttribute('href');
            
            // Update active state
            this.setSidebarActiveItem(link);
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 1024) {
                this.closeSidebar();
            }
            
            this.emit('sidebarNavigate', { route, href, link });
            
            // If using client-side routing
            if (window.CJPaymentApp?.router) {
                e.preventDefault();
                window.CJPaymentApp.router.navigate(href);
            }
        }
    }
    
    toggleSidebarSubmenu(parentItem, itemId) {
        const isExpanded = this.state.expandedSidebarItems.has(itemId);
        
        if (isExpanded) {
            this.state.expandedSidebarItems.delete(itemId);
            parentItem.classList.remove('expanded');
        } else {
            this.state.expandedSidebarItems.add(itemId);
            parentItem.classList.add('expanded');
        }
        
        // Update ARIA attributes
        const link = parentItem.querySelector('.sidebar__nav-link');
        if (link) {
            link.setAttribute('aria-expanded', (!isExpanded).toString());
        }
        
        this.emit('sidebarSubmenuToggle', { itemId, isExpanded: !isExpanded });
    }
    
    setSidebarActiveItem(activeLink) {
        // Remove active class from all sidebar links
        this.elements.sidebarNavLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        activeLink.classList.add('active');
        
        // Also handle submenu links
        const submenuLinks = document.querySelectorAll('.sidebar__submenu-link');
        submenuLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        if (activeLink.classList.contains('sidebar__submenu-link')) {
            activeLink.classList.add('active');
        }
    }
    
    // Advanced breadcrumb functionality
    initBreadcrumbActions() {
        // Initialize breadcrumb dropdowns
        const dropdowns = document.querySelectorAll('.breadcrumb__dropdown');
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.breadcrumb__action');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleBreadcrumbDropdown(dropdown);
                });
            }
        });
        
        // Initialize quick actions
        const quickActions = document.querySelectorAll('.breadcrumb__quick-action');
        quickActions.forEach(action => {
            action.addEventListener('click', (e) => {
                this.handleBreadcrumbQuickAction(e, action);
            });
        });
    }
    
    toggleBreadcrumbDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.breadcrumb__dropdown.open').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('open');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('open', !isOpen);
        
        this.emit('breadcrumbDropdownToggle', { dropdown, isOpen: !isOpen });
    }
    
    handleBreadcrumbQuickAction(e, action) {
        const actionType = action.getAttribute('data-action');
        const actionData = action.getAttribute('data-action-data');
        
        switch (actionType) {
            case 'refresh':
                this.refreshCurrentPage();
                break;
            case 'bookmark':
                this.bookmarkCurrentPage();
                break;
            case 'share':
                this.shareCurrentPage();
                break;
            case 'print':
                this.printCurrentPage();
                break;
            case 'export':
                this.exportCurrentPage(actionData);
                break;
            default:
                this.emit('breadcrumbQuickAction', { actionType, actionData, action });
        }
        
        e.preventDefault();
    }
    
    refreshCurrentPage() {
        window.location.reload();
    }
    
    bookmarkCurrentPage() {
        // Add to browser bookmarks or internal favorites
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            alert('请使用 Ctrl+D (Windows) 或 Cmd+D (Mac) 添加书签');
        } else {
            // Fallback for other browsers
            window.external?.AddFavorite?.(window.location.href, document.title);
        }
        
        this.emit('pageBookmarked', { url: window.location.href, title: document.title });
    }
    
    shareCurrentPage() {
        if (navigator.share) {
            navigator.share({
                title: document.title,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showToast('链接已复制到剪贴板', 'success');
            }).catch(() => {
                this.showToast('复制失败，请手动复制链接', 'error');
            });
        }
        
        this.emit('pageShared', { url: window.location.href, title: document.title });
    }
    
    printCurrentPage() {
        window.print();
        this.emit('pagePrinted');
    }
    
    exportCurrentPage(format = 'pdf') {
        // Trigger export functionality
        this.emit('pageExport', { format });
        this.showToast(`正在导出为 ${format.toUpperCase()} 格式...`, 'info');
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--${type === 'success' ? 'success' : type === 'error' ? 'error' : 'info'}-500);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Enhanced breadcrumb management
    addBreadcrumbItem(item) {
        if (!this.elements.breadcrumb) return;
        
        const breadcrumbList = this.elements.breadcrumb.querySelector('.breadcrumb__list') || 
                              this.elements.breadcrumb.querySelector('ol') ||
                              this.elements.breadcrumb;
        
        const breadcrumbItem = document.createElement('li');
        breadcrumbItem.className = 'breadcrumb__item';
        breadcrumbItem.innerHTML = `
            ${item.icon ? `<span class="breadcrumb__icon">${item.icon}</span>` : ''}
            <a href="${item.url}" class="breadcrumb__link">${item.title}</a>
        `;
        
        breadcrumbList.appendChild(breadcrumbItem);
        
        // Update history
        this.state.breadcrumbHistory.push(item);
        
        this.emit('breadcrumbItemAdded', { item });
    }
    
    removeBreadcrumbItem(index) {
        if (!this.elements.breadcrumb) return;
        
        const breadcrumbList = this.elements.breadcrumb.querySelector('.breadcrumb__list') || 
                              this.elements.breadcrumb.querySelector('ol') ||
                              this.elements.breadcrumb;
        
        const items = breadcrumbList.querySelectorAll('.breadcrumb__item');
        if (items[index]) {
            items[index].remove();
            this.state.breadcrumbHistory.splice(index, 1);
            
            this.emit('breadcrumbItemRemoved', { index });
        }
    }
    
    clearBreadcrumb() {
        if (!this.elements.breadcrumb) return;
        
        const breadcrumbList = this.elements.breadcrumb.querySelector('.breadcrumb__list') || 
                              this.elements.breadcrumb.querySelector('ol') ||
                              this.elements.breadcrumb;
        
        breadcrumbList.innerHTML = '';
        this.state.breadcrumbHistory = [];
        
        this.emit('breadcrumbCleared');
    }
    
    // Public API methods
    setActiveNavItem(route) {
        this.setActiveRoute(route);
    }
    
    addNotification(route, count) {
        this.updateNotificationBadge(route, count);
    }
    
    clearNotification(route) {
        this.updateNotificationBadge(route, 0);
    }
    
    openSidebar() {
        if (!this.state.isSidebarOpen) {
            this.toggleSidebar();
        }
    }
    
    closeSidebarMenu() {
        this.closeSidebar();
    }
    
    setSidebarActive(itemId) {
        const link = document.querySelector(`[data-item-id="${itemId}"]`);
        if (link) {
            this.setSidebarActiveItem(link);
        }
    }
    
    expandSidebarItem(itemId) {
        const parentItem = document.querySelector(`[data-item-id="${itemId}"]`)?.closest('.sidebar__nav-item');
        if (parentItem && !this.state.expandedSidebarItems.has(itemId)) {
            this.toggleSidebarSubmenu(parentItem, itemId);
        }
    }
    
    collapseSidebarItem(itemId) {
        const parentItem = document.querySelector(`[data-item-id="${itemId}"]`)?.closest('.sidebar__nav-item');
        if (parentItem && this.state.expandedSidebarItems.has(itemId)) {
            this.toggleSidebarSubmenu(parentItem, itemId);
        }
    }
    
    // Event system
    emit(eventName, data) {
        const event = new CustomEvent(`navigation:${eventName}`, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }
    
    on(eventName, callback) {
        document.addEventListener(`navigation:${eventName}`, callback);
    }
    
    off(eventName, callback) {
        document.removeEventListener(`navigation:${eventName}`, callback);
    }
    
    // Cleanup
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('scroll', this.handleScroll);
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.closeAllDropdowns);
        
        // Clear timeouts
        clearTimeout(this.searchTimeout);
        clearTimeout(this.resizeTimeout);
        
        // Reset body overflow
        document.body.style.overflow = '';
        
        console.log('Navigation component destroyed');
    }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.navigationComponent = new NavigationComponent();
    });
} else {
    window.navigationComponent = new NavigationComponent();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationComponent;
}