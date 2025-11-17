/**
 * CJPayment Data Display Enhancements
 * Enhanced data visualization and table functionality
 */

window.CJDataEnhancements = (function() {
    'use strict';

    // ==========================================================================
    // Virtual Scrolling for Large Data Sets
    // ==========================================================================

    class VirtualScrollTable {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? CJUtils.$(container) : container;
            this.options = {
                itemHeight: 50,
                bufferSize: 10,
                data: [],
                columns: [],
                renderItem: null,
                onScroll: null,
                ...options
            };

            this.scrollTop = 0;
            this.visibleStart = 0;
            this.visibleEnd = 0;
            this.totalHeight = 0;
            this.viewportHeight = 0;

            this.init();
        }

        init() {
            this.createStructure();
            this.bindEvents();
            this.updateData(this.options.data);
        }

        createStructure() {
            this.container.innerHTML = `
                <div class="virtual-table-header">
                    <table class="table-header">
                        <thead>
                            <tr>
                                ${this.options.columns.map(col => 
                                    `<th style="width: ${col.width || 'auto'}">${col.title}</th>`
                                ).join('')}
                            </tr>
                        </thead>
                    </table>
                </div>
                <div class="virtual-table-viewport">
                    <div class="virtual-table-spacer-before"></div>
                    <div class="virtual-table-content"></div>
                    <div class="virtual-table-spacer-after"></div>
                </div>
            `;

            this.viewport = this.container.querySelector('.virtual-table-viewport');
            this.content = this.container.querySelector('.virtual-table-content');
            this.spacerBefore = this.container.querySelector('.virtual-table-spacer-before');
            this.spacerAfter = this.container.querySelector('.virtual-table-spacer-after');

            // Add styles
            this.addStyles();
        }

        addStyles() {
            if (CJUtils.$('#virtual-table-styles')) return;

            const style = document.createElement('style');
            style.id = 'virtual-table-styles';
            style.textContent = `
                .virtual-table-header {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background: white;
                    border-bottom: 2px solid #dee2e6;
                }
                .virtual-table-viewport {
                    height: 400px;
                    overflow-y: auto;
                    border: 1px solid #dee2e6;
                }
                .virtual-table-content {
                    position: relative;
                }
                .virtual-table-row {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background-color 0.2s ease;
                }
                .virtual-table-row:hover {
                    background-color: #f8f9fa;
                }
                .virtual-table-cell {
                    flex: 1;
                    padding: 0 8px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .table-header {
                    width: 100%;
                    margin: 0;
                }
                .table-header th {
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    background: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                }
            `;
            document.head.appendChild(style);
        }

        bindEvents() {
            this.viewport.addEventListener('scroll', CJUtils.throttle(() => {
                this.handleScroll();
            }, 16)); // 60fps
        }

        handleScroll() {
            this.scrollTop = this.viewport.scrollTop;
            this.updateVisibleRange();
            this.renderVisibleItems();

            if (this.options.onScroll) {
                this.options.onScroll(this.scrollTop, this.visibleStart, this.visibleEnd);
            }
        }

        updateVisibleRange() {
            this.viewportHeight = this.viewport.clientHeight;
            const start = Math.floor(this.scrollTop / this.options.itemHeight);
            const end = Math.min(
                start + Math.ceil(this.viewportHeight / this.options.itemHeight) + this.options.bufferSize,
                this.options.data.length
            );

            this.visibleStart = Math.max(0, start - this.options.bufferSize);
            this.visibleEnd = end;
        }

        renderVisibleItems() {
            const fragment = document.createDocumentFragment();
            
            for (let i = this.visibleStart; i < this.visibleEnd; i++) {
                const item = this.options.data[i];
                if (!item) continue;

                const row = document.createElement('div');
                row.className = 'virtual-table-row';
                row.style.height = `${this.options.itemHeight}px`;
                row.dataset.index = i;

                if (this.options.renderItem) {
                    row.innerHTML = this.options.renderItem(item, i);
                } else {
                    row.innerHTML = this.options.columns.map(col => 
                        `<div class="virtual-table-cell">${item[col.key] || ''}</div>`
                    ).join('');
                }

                fragment.appendChild(row);
            }

            this.content.innerHTML = '';
            this.content.appendChild(fragment);

            // Update spacers
            this.spacerBefore.style.height = `${this.visibleStart * this.options.itemHeight}px`;
            this.spacerAfter.style.height = `${(this.options.data.length - this.visibleEnd) * this.options.itemHeight}px`;
        }

        updateData(data) {
            this.options.data = data;
            this.totalHeight = data.length * this.options.itemHeight;
            this.updateVisibleRange();
            this.renderVisibleItems();
        }

        scrollToIndex(index) {
            const scrollTop = index * this.options.itemHeight;
            this.viewport.scrollTop = scrollTop;
        }

        getVisibleData() {
            return this.options.data.slice(this.visibleStart, this.visibleEnd);
        }
    }

    // ==========================================================================
    // Real-time Data Updates
    // ==========================================================================

    class RealTimeDataManager {
        constructor(options = {}) {
            this.options = {
                endpoint: '/api/realtime/data',
                interval: 5000,
                maxRetries: 3,
                onUpdate: null,
                onError: null,
                ...options
            };

            this.isRunning = false;
            this.retryCount = 0;
            this.lastUpdate = null;
            this.subscribers = new Map();
            this.eventSource = null;
        }

        start() {
            if (this.isRunning) return;

            this.isRunning = true;
            this.retryCount = 0;

            // Try Server-Sent Events first
            if (this.options.useSSE && typeof EventSource !== 'undefined') {
                this.startSSE();
            } else {
                this.startPolling();
            }
        }

        stop() {
            this.isRunning = false;
            
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }

            if (this.pollTimer) {
                clearTimeout(this.pollTimer);
                this.pollTimer = null;
            }
        }

        startSSE() {
            try {
                this.eventSource = new EventSource(this.options.endpoint);
                
                this.eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleUpdate(data);
                    } catch (error) {
                        console.error('Error parsing SSE data:', error);
                    }
                };

                this.eventSource.onerror = (error) => {
                    console.error('SSE error:', error);
                    this.eventSource.close();
                    // Fallback to polling
                    setTimeout(() => {
                        if (this.isRunning) {
                            this.startPolling();
                        }
                    }, 1000);
                };
            } catch (error) {
                console.error('Error starting SSE:', error);
                this.startPolling();
            }
        }

        startPolling() {
            if (!this.isRunning) return;

            this.fetchData()
                .then(data => {
                    this.handleUpdate(data);
                    this.retryCount = 0;
                    this.scheduleNextPoll();
                })
                .catch(error => {
                    this.handleError(error);
                    this.scheduleRetry();
                });
        }

        async fetchData() {
            const response = await fetch(this.options.endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        }

        handleUpdate(data) {
            this.lastUpdate = new Date();
            
            // Notify subscribers
            this.subscribers.forEach((callback, key) => {
                try {
                    callback(data, this.lastUpdate);
                } catch (error) {
                    console.error(`Error in subscriber ${key}:`, error);
                }
            });

            if (this.options.onUpdate) {
                this.options.onUpdate(data, this.lastUpdate);
            }
        }

        handleError(error) {
            console.error('Real-time data error:', error);
            
            if (this.options.onError) {
                this.options.onError(error, this.retryCount);
            }
        }

        scheduleNextPoll() {
            if (!this.isRunning) return;
            
            this.pollTimer = setTimeout(() => {
                this.startPolling();
            }, this.options.interval);
        }

        scheduleRetry() {
            if (!this.isRunning || this.retryCount >= this.options.maxRetries) {
                this.stop();
                return;
            }

            this.retryCount++;
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000); // Exponential backoff
            
            this.pollTimer = setTimeout(() => {
                this.startPolling();
            }, delay);
        }

        subscribe(key, callback) {
            this.subscribers.set(key, callback);
        }

        unsubscribe(key) {
            this.subscribers.delete(key);
        }

        getLastUpdate() {
            return this.lastUpdate;
        }

        isConnected() {
            return this.isRunning && (this.eventSource?.readyState === EventSource.OPEN || this.pollTimer !== null);
        }
    }

    // ==========================================================================
    // Advanced Filtering and Sorting
    // ==========================================================================

    class AdvancedDataFilter {
        constructor(data, options = {}) {
            this.originalData = data;
            this.filteredData = [...data];
            this.options = {
                caseSensitive: false,
                fuzzySearch: true,
                fuzzyThreshold: 0.6,
                ...options
            };

            this.filters = new Map();
            this.sortConfig = null;
        }

        addFilter(key, filterFn) {
            this.filters.set(key, filterFn);
            return this.applyFilters();
        }

        removeFilter(key) {
            this.filters.delete(key);
            return this.applyFilters();
        }

        clearFilters() {
            this.filters.clear();
            return this.applyFilters();
        }

        applyFilters() {
            this.filteredData = this.originalData.filter(item => {
                for (const [key, filterFn] of this.filters) {
                    if (!filterFn(item)) {
                        return false;
                    }
                }
                return true;
            });

            // Re-apply sorting if configured
            if (this.sortConfig) {
                this.applySorting();
            }

            return this.filteredData;
        }

        // Text search with fuzzy matching
        addTextFilter(key, searchTerm, fields) {
            if (!searchTerm.trim()) {
                this.removeFilter(key);
                return this.filteredData;
            }

            const filterFn = (item) => {
                const searchLower = searchTerm.toLowerCase();
                
                return fields.some(field => {
                    const value = this.getNestedValue(item, field);
                    if (!value) return false;
                    
                    const valueLower = String(value).toLowerCase();
                    
                    if (this.options.fuzzySearch) {
                        return this.fuzzyMatch(valueLower, searchLower);
                    } else {
                        return valueLower.includes(searchLower);
                    }
                });
            };

            return this.addFilter(key, filterFn);
        }

        // Range filter for numbers and dates
        addRangeFilter(key, field, min, max) {
            if (min === null && max === null) {
                this.removeFilter(key);
                return this.filteredData;
            }

            const filterFn = (item) => {
                const value = this.getNestedValue(item, field);
                if (value === null || value === undefined) return false;

                const numValue = typeof value === 'number' ? value : parseFloat(value);
                if (isNaN(numValue)) return false;

                if (min !== null && numValue < min) return false;
                if (max !== null && numValue > max) return false;

                return true;
            };

            return this.addFilter(key, filterFn);
        }

        // Multi-select filter
        addMultiSelectFilter(key, field, selectedValues) {
            if (!selectedValues || selectedValues.length === 0) {
                this.removeFilter(key);
                return this.filteredData;
            }

            const filterFn = (item) => {
                const value = this.getNestedValue(item, field);
                return selectedValues.includes(value);
            };

            return this.addFilter(key, filterFn);
        }

        // Date range filter
        addDateRangeFilter(key, field, startDate, endDate) {
            if (!startDate && !endDate) {
                this.removeFilter(key);
                return this.filteredData;
            }

            const filterFn = (item) => {
                const value = this.getNestedValue(item, field);
                if (!value) return false;

                const date = new Date(value);
                if (isNaN(date.getTime())) return false;

                if (startDate && date < new Date(startDate)) return false;
                if (endDate && date > new Date(endDate)) return false;

                return true;
            };

            return this.addFilter(key, filterFn);
        }

        // Sorting
        sort(field, direction = 'asc', type = 'auto') {
            this.sortConfig = { field, direction, type };
            return this.applySorting();
        }

        applySorting() {
            if (!this.sortConfig) return this.filteredData;

            const { field, direction, type } = this.sortConfig;
            
            this.filteredData.sort((a, b) => {
                const aVal = this.getNestedValue(a, field);
                const bVal = this.getNestedValue(b, field);

                let comparison = 0;

                if (type === 'number' || (type === 'auto' && typeof aVal === 'number')) {
                    comparison = (parseFloat(aVal) || 0) - (parseFloat(bVal) || 0);
                } else if (type === 'date' || (type === 'auto' && this.isDate(aVal))) {
                    comparison = new Date(aVal) - new Date(bVal);
                } else {
                    // String comparison
                    const aStr = String(aVal || '').toLowerCase();
                    const bStr = String(bVal || '').toLowerCase();
                    comparison = aStr.localeCompare(bStr);
                }

                return direction === 'desc' ? -comparison : comparison;
            });

            return this.filteredData;
        }

        // Utility methods
        getNestedValue(obj, path) {
            return path.split('.').reduce((current, key) => current?.[key], obj);
        }

        fuzzyMatch(text, pattern) {
            const textLen = text.length;
            const patternLen = pattern.length;
            
            if (patternLen === 0) return true;
            if (textLen === 0) return false;

            // Simple fuzzy matching algorithm
            let textIndex = 0;
            let patternIndex = 0;
            let matches = 0;

            while (textIndex < textLen && patternIndex < patternLen) {
                if (text[textIndex] === pattern[patternIndex]) {
                    matches++;
                    patternIndex++;
                }
                textIndex++;
            }

            const score = matches / patternLen;
            return score >= this.options.fuzzyThreshold;
        }

        isDate(value) {
            return value instanceof Date || 
                   (typeof value === 'string' && !isNaN(Date.parse(value)));
        }

        updateData(newData) {
            this.originalData = newData;
            return this.applyFilters();
        }

        getFilteredData() {
            return this.filteredData;
        }

        getStats() {
            return {
                total: this.originalData.length,
                filtered: this.filteredData.length,
                filtersActive: this.filters.size,
                sortActive: !!this.sortConfig
            };
        }
    }

    // ==========================================================================
    // Chart Enhancements
    // ==========================================================================

    class ChartEnhancer {
        constructor() {
            this.charts = new Map();
            this.themes = {
                default: {
                    colors: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    gridColor: '#e0e0e0'
                },
                dark: {
                    colors: ['#5dade2', '#ec7063', '#58d68d', '#f7dc6f', '#bb8fce', '#76d7c4'],
                    backgroundColor: 'rgba(45, 45, 45, 0.8)',
                    gridColor: '#555555'
                }
            };
            this.currentTheme = 'default';
        }

        createResponsiveChart(canvasId, config, options = {}) {
            const canvas = CJUtils.$(canvasId);
            if (!canvas) return null;

            const enhancedConfig = this.enhanceChartConfig(config, options);
            const chart = new Chart(canvas, enhancedConfig);
            
            this.charts.set(canvasId, chart);
            this.makeChartResponsive(chart, canvas);
            
            return chart;
        }

        enhanceChartConfig(config, options) {
            const theme = this.themes[this.currentTheme];
            
            // Apply theme colors
            if (config.data && config.data.datasets) {
                config.data.datasets.forEach((dataset, index) => {
                    if (!dataset.backgroundColor) {
                        dataset.backgroundColor = theme.colors[index % theme.colors.length];
                    }
                    if (!dataset.borderColor) {
                        dataset.borderColor = theme.colors[index % theme.colors.length];
                    }
                });
            }

            // Enhanced options
            const enhancedOptions = {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.backgroundColor,
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: theme.gridColor,
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            ...config.options?.plugins?.tooltip?.callbacks
                        }
                    }
                },
                scales: this.enhanceScales(config.options?.scales, theme),
                ...config.options,
                ...options
            };

            return {
                ...config,
                options: enhancedOptions
            };
        }

        enhanceScales(scales, theme) {
            if (!scales) return {};

            const enhancedScales = {};
            
            Object.keys(scales).forEach(scaleKey => {
                enhancedScales[scaleKey] = {
                    grid: {
                        color: theme.gridColor,
                        borderColor: theme.gridColor
                    },
                    ticks: {
                        color: '#666'
                    },
                    ...scales[scaleKey]
                };
            });

            return enhancedScales;
        }

        makeChartResponsive(chart, canvas) {
            const resizeObserver = new ResizeObserver(() => {
                chart.resize();
            });
            
            resizeObserver.observe(canvas.parentElement);
        }

        addRealTimeUpdate(chartId, dataSource, updateInterval = 5000) {
            const chart = this.charts.get(chartId);
            if (!chart) return;

            const updateChart = async () => {
                try {
                    const newData = await dataSource();
                    this.updateChartData(chart, newData);
                } catch (error) {
                    console.error('Error updating chart data:', error);
                }
            };

            // Initial update
            updateChart();

            // Set up interval
            const intervalId = setInterval(updateChart, updateInterval);
            
            // Store interval ID for cleanup
            chart._realTimeInterval = intervalId;
        }

        updateChartData(chart, newData) {
            if (newData.labels) {
                chart.data.labels = newData.labels;
            }
            
            if (newData.datasets) {
                newData.datasets.forEach((newDataset, index) => {
                    if (chart.data.datasets[index]) {
                        chart.data.datasets[index].data = newDataset.data;
                    }
                });
            }

            chart.update('none'); // No animation for real-time updates
        }

        setTheme(themeName) {
            if (!this.themes[themeName]) return;
            
            this.currentTheme = themeName;
            
            // Update all existing charts
            this.charts.forEach(chart => {
                this.applyThemeToChart(chart);
            });
        }

        applyThemeToChart(chart) {
            const theme = this.themes[this.currentTheme];
            
            // Update dataset colors
            chart.data.datasets.forEach((dataset, index) => {
                dataset.backgroundColor = theme.colors[index % theme.colors.length];
                dataset.borderColor = theme.colors[index % theme.colors.length];
            });

            // Update scales
            Object.keys(chart.options.scales || {}).forEach(scaleKey => {
                const scale = chart.options.scales[scaleKey];
                if (scale.grid) {
                    scale.grid.color = theme.gridColor;
                    scale.grid.borderColor = theme.gridColor;
                }
            });

            chart.update();
        }

        destroyChart(chartId) {
            const chart = this.charts.get(chartId);
            if (chart) {
                if (chart._realTimeInterval) {
                    clearInterval(chart._realTimeInterval);
                }
                chart.destroy();
                this.charts.delete(chartId);
            }
        }

        destroyAllCharts() {
            this.charts.forEach((chart, chartId) => {
                this.destroyChart(chartId);
            });
        }
    }

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        VirtualScrollTable,
        RealTimeDataManager,
        AdvancedDataFilter,
        ChartEnhancer,

        // Convenience methods
        createVirtualTable: (container, options) => new VirtualScrollTable(container, options),
        createRealTimeManager: (options) => new RealTimeDataManager(options),
        createDataFilter: (data, options) => new AdvancedDataFilter(data, options),
        createChartEnhancer: () => new ChartEnhancer()
    };
})();