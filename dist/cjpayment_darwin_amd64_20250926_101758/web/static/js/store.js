/**
 * CJPayment State Management
 * Centralized state management system
 */

window.CJStore = (function() {
    'use strict';

    // ==========================================================================
    // Store Class
    // ==========================================================================

    class Store {
        constructor(options = {}) {
            this.state = options.state || {};
            this.mutations = options.mutations || {};
            this.actions = options.actions || {};
            this.getters = options.getters || {};
            this.modules = options.modules || {};
            
            this.subscribers = [];
            this.actionSubscribers = [];
            this.isCommitting = false;
            
            this.init();
        }

        init() {
            // Initialize modules
            this.initializeModules();
            
            // Setup reactive getters
            this.setupGetters();
            
            // Load persisted state
            this.loadPersistedState();
        }

        initializeModules() {
            Object.entries(this.modules).forEach(([name, module]) => {
                this.registerModule(name, module);
            });
        }

        setupGetters() {
            this._getters = {};
            Object.entries(this.getters).forEach(([key, getter]) => {
                Object.defineProperty(this._getters, key, {
                    get: () => getter(this.state, this._getters),
                    enumerable: true
                });
            });
        }

        // ==========================================================================
        // State Management
        // ==========================================================================

        /**
         * Get current state
         */
        getState() {
            return this.state;
        }

        /**
         * Commit a mutation
         * @param {string} type - Mutation type
         * @param {*} payload - Mutation payload
         */
        commit(type, payload) {
            const mutation = this.mutations[type];
            if (!mutation) {
                console.error(`Unknown mutation type: ${type}`);
                return;
            }

            this.isCommitting = true;
            
            try {
                mutation(this.state, payload);
                
                // Notify subscribers
                this.subscribers.forEach(subscriber => {
                    subscriber({ type, payload }, this.state);
                });
                
                // Persist state if needed
                this.persistState();
                
            } catch (error) {
                console.error(`Mutation error in ${type}:`, error);
            } finally {
                this.isCommitting = false;
            }
        }

        /**
         * Dispatch an action
         * @param {string} type - Action type
         * @param {*} payload - Action payload
         */
        async dispatch(type, payload) {
            const action = this.actions[type];
            if (!action) {
                console.error(`Unknown action type: ${type}`);
                return;
            }

            // Notify action subscribers (before)
            this.actionSubscribers.forEach(subscriber => {
                subscriber({ type, payload }, this.state, 'before');
            });

            try {
                const result = await action({
                    state: this.state,
                    commit: this.commit.bind(this),
                    dispatch: this.dispatch.bind(this),
                    getters: this._getters
                }, payload);

                // Notify action subscribers (after)
                this.actionSubscribers.forEach(subscriber => {
                    subscriber({ type, payload }, this.state, 'after');
                });

                return result;
            } catch (error) {
                console.error(`Action error in ${type}:`, error);
                
                // Notify action subscribers (error)
                this.actionSubscribers.forEach(subscriber => {
                    subscriber({ type, payload, error }, this.state, 'error');
                });
                
                throw error;
            }
        }

        // ==========================================================================
        // Getters
        // ==========================================================================

        /**
         * Get computed value
         * @param {string} key - Getter key
         */
        get(key) {
            return this._getters[key];
        }

        // ==========================================================================
        // Subscriptions
        // ==========================================================================

        /**
         * Subscribe to mutations
         * @param {Function} subscriber - Subscriber function
         */
        subscribe(subscriber) {
            this.subscribers.push(subscriber);
            
            // Return unsubscribe function
            return () => {
                const index = this.subscribers.indexOf(subscriber);
                if (index > -1) {
                    this.subscribers.splice(index, 1);
                }
            };
        }

        /**
         * Subscribe to actions
         * @param {Function} subscriber - Subscriber function
         */
        subscribeAction(subscriber) {
            this.actionSubscribers.push(subscriber);
            
            // Return unsubscribe function
            return () => {
                const index = this.actionSubscribers.indexOf(subscriber);
                if (index > -1) {
                    this.actionSubscribers.splice(index, 1);
                }
            };
        }

        // ==========================================================================
        // Modules
        // ==========================================================================

        /**
         * Register a module
         * @param {string} name - Module name
         * @param {Object} module - Module definition
         */
        registerModule(name, module) {
            // Initialize module state
            if (module.state) {
                this.state[name] = typeof module.state === 'function' 
                    ? module.state() 
                    : module.state;
            }

            // Register module mutations
            if (module.mutations) {
                Object.entries(module.mutations).forEach(([key, mutation]) => {
                    const mutationType = `${name}/${key}`;
                    this.mutations[mutationType] = (state, payload) => {
                        mutation(state[name], payload);
                    };
                });
            }

            // Register module actions
            if (module.actions) {
                Object.entries(module.actions).forEach(([key, action]) => {
                    const actionType = `${name}/${key}`;
                    this.actions[actionType] = (context, payload) => {
                        const moduleContext = {
                            ...context,
                            state: context.state[name],
                            commit: (type, payload) => {
                                if (type.includes('/')) {
                                    context.commit(type, payload);
                                } else {
                                    context.commit(`${name}/${type}`, payload);
                                }
                            },
                            dispatch: (type, payload) => {
                                if (type.includes('/')) {
                                    return context.dispatch(type, payload);
                                } else {
                                    return context.dispatch(`${name}/${type}`, payload);
                                }
                            }
                        };
                        return action(moduleContext, payload);
                    };
                });
            }

            // Register module getters
            if (module.getters) {
                Object.entries(module.getters).forEach(([key, getter]) => {
                    const getterKey = `${name}/${key}`;
                    this.getters[getterKey] = (state, getters) => {
                        return getter(state[name], getters, state);
                    };
                });
            }

            // Re-setup getters
            this.setupGetters();
        }

        /**
         * Unregister a module
         * @param {string} name - Module name
         */
        unregisterModule(name) {
            // Remove state
            delete this.state[name];

            // Remove mutations
            Object.keys(this.mutations).forEach(key => {
                if (key.startsWith(`${name}/`)) {
                    delete this.mutations[key];
                }
            });

            // Remove actions
            Object.keys(this.actions).forEach(key => {
                if (key.startsWith(`${name}/`)) {
                    delete this.actions[key];
                }
            });

            // Remove getters
            Object.keys(this.getters).forEach(key => {
                if (key.startsWith(`${name}/`)) {
                    delete this.getters[key];
                }
            });

            // Re-setup getters
            this.setupGetters();
        }

        // ==========================================================================
        // Persistence
        // ==========================================================================

        /**
         * Persist state to localStorage
         */
        persistState() {
            try {
                const persistedState = this.getPersistedState();
                CJUtils.storage.set('app_state', persistedState);
            } catch (error) {
                console.error('Failed to persist state:', error);
            }
        }

        /**
         * Load persisted state from localStorage
         */
        loadPersistedState() {
            try {
                const persistedState = CJUtils.storage.get('app_state');
                if (persistedState) {
                    this.restoreState(persistedState);
                }
            } catch (error) {
                console.error('Failed to load persisted state:', error);
            }
        }

        /**
         * Get state to persist (override in subclasses)
         */
        getPersistedState() {
            // Only persist certain parts of state
            return {
                user: this.state.user,
                preferences: this.state.preferences,
                cache: this.state.cache
            };
        }

        /**
         * Restore state from persisted data
         */
        restoreState(persistedState) {
            Object.entries(persistedState).forEach(([key, value]) => {
                if (this.state.hasOwnProperty(key)) {
                    this.state[key] = value;
                }
            });
        }

        // ==========================================================================
        // Development Tools
        // ==========================================================================

        /**
         * Enable development tools
         */
        enableDevTools() {
            if (typeof window !== 'undefined' && window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
                window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('vuex:init', this);
            }
        }
    }

    // ==========================================================================
    // Application Store
    // ==========================================================================

    const appStore = new Store({
        state: {
            // User state
            user: null,
            permissions: [],
            isAuthenticated: false,

            // UI state
            loading: false,
            loadingMessage: '',
            sidebarCollapsed: false,
            theme: 'default',
            language: 'zh-CN',

            // Navigation state
            currentRoute: null,
            breadcrumbs: [],

            // Notifications
            notifications: [],
            unreadCount: 0,

            // Cache
            cache: {},

            // Preferences
            preferences: {
                pageSize: 10,
                dateFormat: 'YYYY-MM-DD',
                currency: 'CNY'
            }
        },

        mutations: {
            // User mutations
            SET_USER(state, user) {
                state.user = user;
                state.isAuthenticated = !!user;
            },

            SET_PERMISSIONS(state, permissions) {
                state.permissions = permissions || [];
            },

            CLEAR_USER(state) {
                state.user = null;
                state.permissions = [];
                state.isAuthenticated = false;
            },

            // UI mutations
            SET_LOADING(state, { loading, message = '' }) {
                state.loading = loading;
                state.loadingMessage = message;
            },

            SET_SIDEBAR_COLLAPSED(state, collapsed) {
                state.sidebarCollapsed = collapsed;
            },

            SET_THEME(state, theme) {
                state.theme = theme;
            },

            SET_LANGUAGE(state, language) {
                state.language = language;
            },

            // Navigation mutations
            SET_CURRENT_ROUTE(state, route) {
                state.currentRoute = route;
            },

            SET_BREADCRUMBS(state, breadcrumbs) {
                state.breadcrumbs = breadcrumbs;
            },

            // Notification mutations
            ADD_NOTIFICATION(state, notification) {
                state.notifications.unshift({
                    id: Date.now() + Math.random(),
                    timestamp: new Date(),
                    read: false,
                    ...notification
                });
                state.unreadCount = state.notifications.filter(n => !n.read).length;
            },

            MARK_NOTIFICATION_READ(state, id) {
                const notification = state.notifications.find(n => n.id === id);
                if (notification) {
                    notification.read = true;
                    state.unreadCount = state.notifications.filter(n => !n.read).length;
                }
            },

            MARK_ALL_NOTIFICATIONS_READ(state) {
                state.notifications.forEach(n => n.read = true);
                state.unreadCount = 0;
            },

            REMOVE_NOTIFICATION(state, id) {
                const index = state.notifications.findIndex(n => n.id === id);
                if (index > -1) {
                    state.notifications.splice(index, 1);
                    state.unreadCount = state.notifications.filter(n => !n.read).length;
                }
            },

            // Cache mutations
            SET_CACHE(state, { key, value, ttl = 300000 }) {
                state.cache[key] = {
                    value,
                    timestamp: Date.now(),
                    ttl
                };
            },

            CLEAR_CACHE(state, pattern) {
                if (pattern) {
                    const regex = new RegExp(pattern);
                    Object.keys(state.cache).forEach(key => {
                        if (regex.test(key)) {
                            delete state.cache[key];
                        }
                    });
                } else {
                    state.cache = {};
                }
            },

            // Preferences mutations
            SET_PREFERENCE(state, { key, value }) {
                state.preferences[key] = value;
            },

            SET_PREFERENCES(state, preferences) {
                state.preferences = { ...state.preferences, ...preferences };
            }
        },

        actions: {
            // Authentication actions
            async login({ commit, dispatch }, credentials) {
                try {
                    commit('SET_LOADING', { loading: true, message: '登录中...' });
                    
                    const response = await CJApi.auth.login(credentials);
                    
                    if (response.token) {
                        CJUtils.storage.set('auth_token', response.token);
                        commit('SET_USER', response.user);
                        commit('SET_PERMISSIONS', response.permissions);
                        
                        // Load user preferences
                        await dispatch('loadUserPreferences');
                        
                        return response;
                    }
                } finally {
                    commit('SET_LOADING', { loading: false });
                }
            },

            async logout({ commit }) {
                try {
                    await CJApi.auth.logout();
                } catch (error) {
                    console.error('Logout API error:', error);
                } finally {
                    CJUtils.storage.remove('auth_token');
                    commit('CLEAR_USER');
                    commit('CLEAR_CACHE');
                }
            },

            async refreshToken({ commit }) {
                try {
                    const response = await CJApi.auth.refresh();
                    if (response.token) {
                        CJUtils.storage.set('auth_token', response.token);
                        return true;
                    }
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    commit('CLEAR_USER');
                    return false;
                }
            },

            // User preferences actions
            async loadUserPreferences({ commit, state }) {
                if (!state.user) return;

                try {
                    const preferences = CJUtils.storage.get('user_preferences', {});
                    commit('SET_PREFERENCES', preferences);
                    
                    // Apply theme
                    if (preferences.theme) {
                        commit('SET_THEME', preferences.theme);
                    }
                    
                    // Apply language
                    if (preferences.language) {
                        commit('SET_LANGUAGE', preferences.language);
                    }
                } catch (error) {
                    console.error('Failed to load user preferences:', error);
                }
            },

            async saveUserPreferences({ state }) {
                try {
                    const preferences = {
                        theme: state.theme,
                        language: state.language,
                        ...state.preferences
                    };
                    CJUtils.storage.set('user_preferences', preferences);
                } catch (error) {
                    console.error('Failed to save user preferences:', error);
                }
            },

            // Notification actions
            async fetchNotifications({ commit }) {
                try {
                    const notifications = await CJApi.notifications.list({ unread: true });
                    notifications.forEach(notification => {
                        commit('ADD_NOTIFICATION', notification);
                    });
                } catch (error) {
                    console.error('Failed to fetch notifications:', error);
                }
            },

            // Cache actions
            getCached({ state }, key) {
                const cached = state.cache[key];
                if (cached && Date.now() - cached.timestamp < cached.ttl) {
                    return cached.value;
                }
                return null;
            },

            setCache({ commit }, { key, value, ttl }) {
                commit('SET_CACHE', { key, value, ttl });
            },

            clearCache({ commit }, pattern) {
                commit('CLEAR_CACHE', pattern);
            }
        },

        getters: {
            // User getters
            isAuthenticated: state => state.isAuthenticated,
            currentUser: state => state.user,
            userPermissions: state => state.permissions,
            
            hasPermission: state => permission => {
                return state.permissions.includes(permission);
            },

            hasAnyPermission: state => permissions => {
                return permissions.some(permission => state.permissions.includes(permission));
            },

            // UI getters
            isLoading: state => state.loading,
            loadingMessage: state => state.loadingMessage,
            currentTheme: state => state.theme,
            currentLanguage: state => state.language,

            // Notification getters
            unreadNotifications: state => state.notifications.filter(n => !n.read),
            unreadCount: state => state.unreadCount,
            allNotifications: state => state.notifications,

            // Cache getters
            getCachedValue: state => key => {
                const cached = state.cache[key];
                if (cached && Date.now() - cached.timestamp < cached.ttl) {
                    return cached.value;
                }
                return null;
            }
        }
    });

    // ==========================================================================
    // Store Plugins
    // ==========================================================================

    /**
     * Logger plugin for development
     */
    function createLogger(options = {}) {
        return store => {
            store.subscribe((mutation, state) => {
                if (options.collapsed !== false) {
                    console.groupCollapsed(`mutation ${mutation.type}`);
                } else {
                    console.group(`mutation ${mutation.type}`);
                }
                
                console.log('payload:', mutation.payload);
                console.log('state:', state);
                console.groupEnd();
            });

            store.subscribeAction((action, state, phase) => {
                if (phase === 'before') {
                    console.log(`action ${action.type} started`);
                } else if (phase === 'after') {
                    console.log(`action ${action.type} completed`);
                } else if (phase === 'error') {
                    console.error(`action ${action.type} failed:`, action.error);
                }
            });
        };
    }

    /**
     * Persistence plugin
     */
    function createPersistence(options = {}) {
        return store => {
            // Load initial state
            store.loadPersistedState();

            // Subscribe to mutations
            store.subscribe((mutation, state) => {
                if (options.mutations && !options.mutations.includes(mutation.type)) {
                    return;
                }
                
                // Debounce persistence
                clearTimeout(store._persistTimeout);
                store._persistTimeout = setTimeout(() => {
                    store.persistState();
                }, options.delay || 1000);
            });
        };
    }

    // Apply plugins in development
    if (process.env.NODE_ENV === 'development') {
        createLogger()(appStore);
    }
    
    createPersistence({
        mutations: ['SET_USER', 'SET_PREFERENCES', 'SET_THEME', 'SET_LANGUAGE']
    })(appStore);

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        Store,
        store: appStore,
        createLogger,
        createPersistence
    };
})();