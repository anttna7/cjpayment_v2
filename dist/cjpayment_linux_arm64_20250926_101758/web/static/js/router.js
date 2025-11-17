/**
 * CJPayment Router
 * Single Page Application routing system
 */

window.CJRouter = (function() {
    'use strict';

    class Router {
        constructor(options = {}) {
            this.options = {
                mode: 'history', // 'history' or 'hash'
                root: '/',
                ...options
            };

            this.routes = new Map();
            this.middlewares = [];
            this.currentRoute = null;
            this.currentParams = {};
            this.isNavigating = false;

            this.init();
        }

        init() {
            this.bindEvents();
            this.loadInitialRoute();
        }

        bindEvents() {
            if (this.options.mode === 'history') {
                window.addEventListener('popstate', (e) => {
                    this.handlePopState(e);
                });

                // Intercept link clicks
                document.addEventListener('click', (e) => {
                    if (e.target.matches('a[href]') && this.shouldInterceptLink(e.target)) {
                        e.preventDefault();
                        this.navigate(e.target.getAttribute('href'));
                    }
                });
            } else {
                window.addEventListener('hashchange', () => {
                    this.loadCurrentRoute();
                });
            }
        }

        shouldInterceptLink(link) {
            // Don't intercept external links
            if (link.hostname !== window.location.hostname) {
                return false;
            }

            // Don't intercept links with target="_blank"
            if (link.target === '_blank') {
                return false;
            }

            // Don't intercept links with data-no-route attribute
            if (link.hasAttribute('data-no-route')) {
                return false;
            }

            return true;
        }

        // ==========================================================================
        // Route Registration
        // ==========================================================================

        /**
         * Register a route
         * @param {string} path - Route path with optional parameters
         * @param {Function|Object} handler - Route handler or route config
         * @param {Object} options - Route options
         */
        route(path, handler, options = {}) {
            const route = {
                path: this.normalizePath(path),
                pattern: this.pathToRegex(path),
                handler: typeof handler === 'function' ? handler : handler.handler,
                component: typeof handler === 'object' ? handler.component : null,
                template: typeof handler === 'object' ? handler.template : null,
                middleware: options.middleware || [],
                meta: options.meta || {},
                name: options.name || null
            };

            this.routes.set(path, route);
            return this;
        }

        /**
         * Register multiple routes
         * @param {Object} routes - Routes object
         */
        routes(routes) {
            Object.entries(routes).forEach(([path, config]) => {
                this.route(path, config.handler || config, config);
            });
            return this;
        }

        /**
         * Register middleware
         * @param {Function} middleware - Middleware function
         */
        use(middleware) {
            this.middlewares.push(middleware);
            return this;
        }

        // ==========================================================================
        // Navigation
        // ==========================================================================

        /**
         * Navigate to a route
         * @param {string} path - Target path
         * @param {Object} options - Navigation options
         */
        async navigate(path, options = {}) {
            if (this.isNavigating) return;

            const normalizedPath = this.normalizePath(path);
            const currentPath = this.getCurrentPath();

            // Don't navigate if already on the same route
            if (normalizedPath === currentPath && !options.force) {
                return;
            }

            this.isNavigating = true;

            try {
                // Find matching route
                const match = this.matchRoute(normalizedPath);
                if (!match) {
                    throw new Error(`Route not found: ${path}`);
                }

                // Run middleware
                const context = {
                    path: normalizedPath,
                    params: match.params,
                    query: this.parseQuery(),
                    route: match.route,
                    from: this.currentRoute,
                    meta: match.route.meta
                };

                const canProceed = await this.runMiddleware(context);
                if (!canProceed) {
                    return;
                }

                // Update browser history
                if (!options.replace) {
                    this.pushState(normalizedPath);
                } else {
                    this.replaceState(normalizedPath);
                }

                // Execute route handler
                await this.executeRoute(match, context);

                // Update current route
                this.currentRoute = match.route;
                this.currentParams = match.params;

                // Emit navigation event
                this.emit('route:changed', {
                    route: match.route,
                    params: match.params,
                    query: context.query,
                    path: normalizedPath
                });

            } catch (error) {
                console.error('Navigation error:', error);
                this.emit('route:error', { error, path });
                
                // Try to navigate to error page
                if (path !== '/error') {
                    this.navigate('/error', { replace: true });
                }
            } finally {
                this.isNavigating = false;
            }
        }

        /**
         * Replace current route
         * @param {string} path - Target path
         */
        replace(path) {
            return this.navigate(path, { replace: true });
        }

        /**
         * Go back in history
         */
        back() {
            window.history.back();
        }

        /**
         * Go forward in history
         */
        forward() {
            window.history.forward();
        }

        /**
         * Go to specific history entry
         * @param {number} delta - History delta
         */
        go(delta) {
            window.history.go(delta);
        }

        // ==========================================================================
        // Route Matching
        // ==========================================================================

        matchRoute(path) {
            for (const [routePath, route] of this.routes) {
                const match = path.match(route.pattern);
                if (match) {
                    const params = this.extractParams(route.path, match);
                    return { route, params, match };
                }
            }
            return null;
        }

        pathToRegex(path) {
            // Convert path with parameters to regex
            // /users/:id -> /users/([^/]+)
            // /users/:id? -> /users/([^/]+)?
            // /users/* -> /users/(.*)
            
            const regexPath = path
                .replace(/\//g, '\\/')
                .replace(/:\w+\?/g, '([^/]+)?')
                .replace(/:\w+/g, '([^/]+)')
                .replace(/\*/g, '(.*)');
            
            return new RegExp(`^${regexPath}$`);
        }

        extractParams(routePath, match) {
            const params = {};
            const paramNames = this.getParamNames(routePath);
            
            paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });

            return params;
        }

        getParamNames(path) {
            const matches = path.match(/:(\w+)\??/g);
            if (!matches) return [];
            
            return matches.map(match => match.replace(/[:?]/g, ''));
        }

        // ==========================================================================
        // Middleware System
        // ==========================================================================

        async runMiddleware(context) {
            const allMiddleware = [
                ...this.middlewares,
                ...(context.route.middleware || [])
            ];

            for (const middleware of allMiddleware) {
                try {
                    const result = await middleware(context);
                    if (result === false) {
                        return false; // Stop navigation
                    }
                } catch (error) {
                    console.error('Middleware error:', error);
                    return false;
                }
            }

            return true;
        }

        // ==========================================================================
        // Route Execution
        // ==========================================================================

        async executeRoute(match, context) {
            const { route } = match;

            // Load component if specified
            if (route.component) {
                await this.loadComponent(route.component, context);
            }

            // Load template if specified
            if (route.template) {
                await this.loadTemplate(route.template, context);
            }

            // Execute handler
            if (route.handler) {
                await route.handler(context);
            }
        }

        async loadComponent(componentPath, context) {
            try {
                const module = await import(componentPath);
                if (module.default) {
                    const component = new module.default(context);
                    if (component.render) {
                        await component.render();
                    }
                }
            } catch (error) {
                console.error('Failed to load component:', componentPath, error);
                throw error;
            }
        }

        async loadTemplate(templatePath, context) {
            try {
                const response = await fetch(templatePath);
                if (!response.ok) {
                    throw new Error(`Failed to load template: ${response.statusText}`);
                }
                
                const html = await response.text();
                const container = document.querySelector('#pageContent');
                if (container) {
                    container.innerHTML = html;
                    
                    // Execute any scripts in the template
                    const scripts = container.querySelectorAll('script');
                    scripts.forEach(script => {
                        const newScript = document.createElement('script');
                        newScript.textContent = script.textContent;
                        document.head.appendChild(newScript);
                        document.head.removeChild(newScript);
                    });
                }
            } catch (error) {
                console.error('Failed to load template:', templatePath, error);
                throw error;
            }
        }

        // ==========================================================================
        // URL Management
        // ==========================================================================

        getCurrentPath() {
            if (this.options.mode === 'history') {
                return window.location.pathname;
            } else {
                return window.location.hash.slice(1) || '/';
            }
        }

        normalizePath(path) {
            // Remove trailing slash except for root
            if (path !== '/' && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            
            // Ensure path starts with /
            if (!path.startsWith('/')) {
                path = '/' + path;
            }

            return path;
        }

        pushState(path) {
            if (this.options.mode === 'history') {
                window.history.pushState({ path }, '', path);
            } else {
                window.location.hash = path;
            }
        }

        replaceState(path) {
            if (this.options.mode === 'history') {
                window.history.replaceState({ path }, '', path);
            } else {
                window.location.replace(`#${path}`);
            }
        }

        parseQuery(queryString = window.location.search) {
            const params = new URLSearchParams(queryString);
            const query = {};
            for (const [key, value] of params) {
                query[key] = value;
            }
            return query;
        }

        buildQuery(params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    searchParams.append(key, value);
                }
            });
            return searchParams.toString();
        }

        // ==========================================================================
        // Event Handling
        // ==========================================================================

        handlePopState(e) {
            this.loadCurrentRoute();
        }

        loadInitialRoute() {
            this.loadCurrentRoute();
        }

        loadCurrentRoute() {
            const path = this.getCurrentPath();
            this.navigate(path, { replace: true });
        }

        // ==========================================================================
        // Event System
        // ==========================================================================

        emit(event, data) {
            window.dispatchEvent(new CustomEvent(`router:${event}`, { 
                detail: data 
            }));
        }

        on(event, handler) {
            window.addEventListener(`router:${event}`, handler);
        }

        off(event, handler) {
            window.removeEventListener(`router:${event}`, handler);
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        /**
         * Generate URL for named route
         * @param {string} name - Route name
         * @param {Object} params - Route parameters
         * @param {Object} query - Query parameters
         */
        url(name, params = {}, query = {}) {
            // Find route by name
            const route = Array.from(this.routes.values()).find(r => r.name === name);
            if (!route) {
                throw new Error(`Route not found: ${name}`);
            }

            // Replace parameters in path
            let path = route.path;
            Object.entries(params).forEach(([key, value]) => {
                path = path.replace(`:${key}`, value);
            });

            // Add query string
            const queryString = this.buildQuery(query);
            if (queryString) {
                path += `?${queryString}`;
            }

            return path;
        }

        /**
         * Check if current route matches pattern
         * @param {string} pattern - Route pattern
         */
        is(pattern) {
            const currentPath = this.getCurrentPath();
            const regex = this.pathToRegex(pattern);
            return regex.test(currentPath);
        }

        /**
         * Get current route parameters
         */
        getParams() {
            return { ...this.currentParams };
        }

        /**
         * Get current query parameters
         */
        getQuery() {
            return this.parseQuery();
        }

        /**
         * Get current route
         */
        getCurrentRoute() {
            return this.currentRoute;
        }
    }

    // ==========================================================================
    // Built-in Middleware
    // ==========================================================================

    const middleware = {
        /**
         * Authentication middleware
         */
        auth: (context) => {
            // 演示环境跳过认证检查
            console.log('Router: 演示模式 - 跳过认证检查');
            return true;
            
            // 原始认证逻辑 (演示环境中禁用)
            // if (!window.CJPaymentApp || !window.CJPaymentApp.isAuthenticated()) {
            //     CJUtils.storage.set('intended_route', context.path);
            //     window.location.href = '/login';
            //     return false;
            // }
            // return true;
        },

        /**
         * Permission middleware
         */
        permission: (requiredPermission) => {
            return (context) => {
                if (!window.CJPaymentApp || !window.CJPaymentApp.hasPermission(requiredPermission)) {
                    CJComponents.toast.error('权限不足，无法访问此页面');
                    window.CJRouter.navigate('/dashboard');
                    return false;
                }
                return true;
            };
        },

        /**
         * Loading middleware
         */
        loading: (message = '加载中...') => {
            return (context) => {
                CJComponents.loading.show(message);
                
                // Hide loading after route is loaded
                setTimeout(() => {
                    CJComponents.loading.hide();
                }, 100);
                
                return true;
            };
        },

        /**
         * Title middleware
         */
        title: (title) => {
            return (context) => {
                document.title = `${title} - CJPayment`;
                return true;
            };
        }
    };

    return {
        Router,
        middleware
    };
})();