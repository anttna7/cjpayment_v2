/**
 * 用户行为分析模块
 * 用于深度分析用户行为数据，识别界面问题和改进点
 */

class UserBehaviorAnalytics {
    constructor() {
        this.heatmapData = [];
        this.clickPaths = [];
        this.scrollPatterns = [];
        this.formInteractions = [];
        this.errorPatterns = [];
        this.performanceMetrics = [];
        
        this.init();
    }
    
    init() {
        this.setupHeatmapTracking();
        this.setupScrollTracking();
        this.setupFormTracking();
        this.setupErrorTracking();
        this.setupPerformanceTracking();
    }
    
    /**
     * 设置热力图追踪
     */
    setupHeatmapTracking() {
        let clickTimeout;
        
        document.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const heatmapPoint = {
                x: e.clientX,
                y: e.clientY,
                elementX: rect.left + rect.width / 2,
                elementY: rect.top + rect.height / 2,
                element: this.getElementInfo(e.target),
                timestamp: Date.now(),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
            
            this.heatmapData.push(heatmapPoint);
            this.updateClickPath(heatmapPoint);
            
            // 可视化点击点（调试用）
            if (window.DEBUG_HEATMAP) {
                this.visualizeClick(e.clientX, e.clientY);
            }
        });
        
        // 双击检测
        document.addEventListener('dblclick', (e) => {
            this.recordDoubleClick(e);
        });
    }
    
    /**
     * 设置滚动模式追踪
     */
    setupScrollTracking() {
        let scrollTimeout;
        let lastScrollY = window.scrollY;
        let scrollDirection = 'down';
        let scrollSpeed = 0;
        let scrollStartTime = Date.now();
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            const currentTime = Date.now();
            
            // 计算滚动方向和速度
            if (currentScrollY > lastScrollY) {
                scrollDirection = 'down';
            } else if (currentScrollY < lastScrollY) {
                scrollDirection = 'up';
            }
            
            scrollSpeed = Math.abs(currentScrollY - lastScrollY) / (currentTime - scrollStartTime);
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.recordScrollPattern({
                    startY: lastScrollY,
                    endY: currentScrollY,
                    direction: scrollDirection,
                    speed: scrollSpeed,
                    duration: currentTime - scrollStartTime,
                    timestamp: currentTime,
                    viewportHeight: window.innerHeight,
                    documentHeight: document.documentElement.scrollHeight
                });
                
                scrollStartTime = currentTime;
            }, 150);
            
            lastScrollY = currentScrollY;
        });
    }
    
    /**
     * 设置表单交互追踪
     */
    setupFormTracking() {
        // 表单字段焦点追踪
        document.addEventListener('focusin', (e) => {
            if (this.isFormElement(e.target)) {
                this.recordFormInteraction({
                    type: 'focus',
                    element: this.getElementInfo(e.target),
                    timestamp: Date.now()
                });
            }
        });
        
        // 表单字段失焦追踪
        document.addEventListener('focusout', (e) => {
            if (this.isFormElement(e.target)) {
                this.recordFormInteraction({
                    type: 'blur',
                    element: this.getElementInfo(e.target),
                    value: e.target.value,
                    timestamp: Date.now()
                });
            }
        });
        
        // 表单输入追踪
        document.addEventListener('input', (e) => {
            if (this.isFormElement(e.target)) {
                this.recordFormInteraction({
                    type: 'input',
                    element: this.getElementInfo(e.target),
                    value: e.target.value,
                    valueLength: e.target.value.length,
                    timestamp: Date.now()
                });
            }
        });
        
        // 表单提交追踪
        document.addEventListener('submit', (e) => {
            this.recordFormInteraction({
                type: 'submit',
                element: this.getElementInfo(e.target),
                timestamp: Date.now(),
                formData: this.getFormData(e.target)
            });
        });
    }
    
    /**
     * 设置错误模式追踪
     */
    setupErrorTracking() {
        // JavaScript错误追踪
        window.addEventListener('error', (e) => {
            this.recordError({
                type: 'javascript',
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack,
                timestamp: Date.now()
            });
        });
        
        // Promise拒绝追踪
        window.addEventListener('unhandledrejection', (e) => {
            this.recordError({
                type: 'promise_rejection',
                reason: e.reason,
                timestamp: Date.now()
            });
        });
        
        // 网络错误追踪
        this.setupNetworkErrorTracking();
    }
    
    /**
     * 设置性能追踪
     */
    setupPerformanceTracking() {
        // 页面加载性能
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    this.recordPerformanceMetric({
                        type: 'page_load',
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                        totalTime: perfData.loadEventEnd - perfData.fetchStart,
                        timestamp: Date.now()
                    });
                }
            }, 0);
        });
        
        // 资源加载性能
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'resource') {
                    this.recordPerformanceMetric({
                        type: 'resource_load',
                        name: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize,
                        timestamp: Date.now()
                    });
                }
            });
        });
        
        observer.observe({ entryTypes: ['resource'] });
    }
    
    /**
     * 记录点击路径
     */
    updateClickPath(clickPoint) {
        this.clickPaths.push({
            element: clickPoint.element,
            timestamp: clickPoint.timestamp,
            position: { x: clickPoint.x, y: clickPoint.y }
        });
        
        // 保持路径长度在合理范围内
        if (this.clickPaths.length > 100) {
            this.clickPaths = this.clickPaths.slice(-50);
        }
    }
    
    /**
     * 记录滚动模式
     */
    recordScrollPattern(pattern) {
        this.scrollPatterns.push(pattern);
        
        // 保持数据量在合理范围内
        if (this.scrollPatterns.length > 200) {
            this.scrollPatterns = this.scrollPatterns.slice(-100);
        }
    }
    
    /**
     * 记录表单交互
     */
    recordFormInteraction(interaction) {
        this.formInteractions.push(interaction);
    }
    
    /**
     * 记录错误
     */
    recordError(error) {
        this.errorPatterns.push(error);
        console.warn('用户行为分析 - 错误记录:', error);
    }
    
    /**
     * 记录性能指标
     */
    recordPerformanceMetric(metric) {
        this.performanceMetrics.push(metric);
    }
    
    /**
     * 生成热力图数据
     */
    generateHeatmapData() {
        const heatmapGrid = {};
        const gridSize = 20; // 20px网格
        
        this.heatmapData.forEach(point => {
            const gridX = Math.floor(point.x / gridSize);
            const gridY = Math.floor(point.y / gridSize);
            const key = `${gridX},${gridY}`;
            
            if (!heatmapGrid[key]) {
                heatmapGrid[key] = {
                    x: gridX * gridSize,
                    y: gridY * gridSize,
                    count: 0,
                    elements: new Set()
                };
            }
            
            heatmapGrid[key].count++;
            heatmapGrid[key].elements.add(point.element.tagName);
        });
        
        return Object.values(heatmapGrid).sort((a, b) => b.count - a.count);
    }
    
    /**
     * 分析用户路径
     */
    analyzeUserPaths() {
        const pathAnalysis = {
            commonSequences: [],
            dropOffPoints: [],
            conversionFunnels: []
        };
        
        // 分析常见点击序列
        const sequences = this.findCommonSequences(this.clickPaths, 3);
        pathAnalysis.commonSequences = sequences.slice(0, 10);
        
        // 分析流失点
        pathAnalysis.dropOffPoints = this.identifyDropOffPoints();
        
        // 分析转化漏斗
        pathAnalysis.conversionFunnels = this.analyzeConversionFunnels();
        
        return pathAnalysis;
    }
    
    /**
     * 分析滚动行为
     */
    analyzeScrollBehavior() {
        const scrollAnalysis = {
            averageScrollDepth: 0,
            scrollSpeed: 0,
            backtrackingRate: 0,
            attentionZones: []
        };
        
        if (this.scrollPatterns.length === 0) return scrollAnalysis;
        
        // 计算平均滚动深度
        const scrollDepths = this.scrollPatterns.map(p => 
            Math.max(p.startY, p.endY) / p.documentHeight
        );
        scrollAnalysis.averageScrollDepth = 
            scrollDepths.reduce((sum, depth) => sum + depth, 0) / scrollDepths.length;
        
        // 计算平均滚动速度
        const scrollSpeeds = this.scrollPatterns.map(p => p.speed).filter(s => s > 0);
        scrollAnalysis.scrollSpeed = 
            scrollSpeeds.reduce((sum, speed) => sum + speed, 0) / scrollSpeeds.length;
        
        // 计算回溯率
        const backtrackCount = this.scrollPatterns.filter(p => p.direction === 'up').length;
        scrollAnalysis.backtrackingRate = backtrackCount / this.scrollPatterns.length;
        
        // 识别注意力区域
        scrollAnalysis.attentionZones = this.identifyAttentionZones();
        
        return scrollAnalysis;
    }
    
    /**
     * 分析表单行为
     */
    analyzeFormBehavior() {
        const formAnalysis = {
            completionRate: 0,
            averageFillTime: 0,
            abandonmentPoints: [],
            errorFields: []
        };
        
        if (this.formInteractions.length === 0) return formAnalysis;
        
        // 按表单分组
        const formGroups = this.groupFormInteractionsByForm();
        
        Object.values(formGroups).forEach(interactions => {
            const focusEvents = interactions.filter(i => i.type === 'focus');
            const submitEvents = interactions.filter(i => i.type === 'submit');
            
            // 计算完成率
            if (focusEvents.length > 0) {
                formAnalysis.completionRate += submitEvents.length > 0 ? 1 : 0;
            }
            
            // 计算填写时间
            if (focusEvents.length > 0 && submitEvents.length > 0) {
                const startTime = Math.min(...focusEvents.map(e => e.timestamp));
                const endTime = Math.max(...submitEvents.map(e => e.timestamp));
                formAnalysis.averageFillTime += endTime - startTime;
            }
        });
        
        const formCount = Object.keys(formGroups).length;
        if (formCount > 0) {
            formAnalysis.completionRate = formAnalysis.completionRate / formCount;
            formAnalysis.averageFillTime = formAnalysis.averageFillTime / formCount;
        }
        
        return formAnalysis;
    }
    
    /**
     * 生成用户体验问题报告
     */
    generateUXIssuesReport() {
        const issues = [];
        
        // 分析热力图数据找出问题
        const heatmapData = this.generateHeatmapData();
        const lowClickAreas = heatmapData.filter(area => area.count < 2);
        
        if (lowClickAreas.length > heatmapData.length * 0.8) {
            issues.push({
                type: 'low_engagement',
                severity: 'medium',
                description: '页面大部分区域点击率较低，可能存在可发现性问题',
                recommendation: '考虑重新设计页面布局，突出重要功能'
            });
        }
        
        // 分析滚动行为找出问题
        const scrollAnalysis = this.analyzeScrollBehavior();
        if (scrollAnalysis.averageScrollDepth < 0.3) {
            issues.push({
                type: 'shallow_engagement',
                severity: 'high',
                description: '用户平均滚动深度较浅，可能首屏内容不够吸引人',
                recommendation: '优化首屏内容，增加用户继续浏览的动机'
            });
        }
        
        if (scrollAnalysis.backtrackingRate > 0.4) {
            issues.push({
                type: 'navigation_confusion',
                severity: 'medium',
                description: '用户回溯率较高，可能存在导航混乱问题',
                recommendation: '改进页面结构和导航设计'
            });
        }
        
        // 分析表单行为找出问题
        const formAnalysis = this.analyzeFormBehavior();
        if (formAnalysis.completionRate < 0.6) {
            issues.push({
                type: 'form_abandonment',
                severity: 'high',
                description: '表单完成率较低，存在用户流失问题',
                recommendation: '简化表单流程，改进表单设计和验证机制'
            });
        }
        
        // 分析错误模式
        if (this.errorPatterns.length > 0) {
            const errorTypes = this.categorizeErrors();
            Object.entries(errorTypes).forEach(([type, errors]) => {
                if (errors.length > 2) {
                    issues.push({
                        type: 'technical_issues',
                        severity: 'high',
                        description: `频繁出现${type}错误`,
                        recommendation: '修复技术问题，提升系统稳定性',
                        details: errors.slice(0, 3)
                    });
                }
            });
        }
        
        return issues;
    }
    
    /**
     * 生成改进建议
     */
    generateImprovementSuggestions() {
        const suggestions = [];
        
        // 基于热力图的建议
        const heatmapData = this.generateHeatmapData();
        const hotspots = heatmapData.slice(0, 5);
        
        suggestions.push({
            category: 'layout',
            priority: 'medium',
            title: '优化热点区域布局',
            description: '基于用户点击热力图，调整重要功能的位置',
            details: `主要热点区域: ${hotspots.map(h => `(${h.x}, ${h.y})`).join(', ')}`
        });
        
        // 基于路径分析的建议
        const pathAnalysis = this.analyzeUserPaths();
        if (pathAnalysis.commonSequences.length > 0) {
            suggestions.push({
                category: 'navigation',
                priority: 'high',
                title: '优化用户操作流程',
                description: '基于常见用户路径，简化操作步骤',
                details: `常见操作序列: ${pathAnalysis.commonSequences[0].join(' → ')}`
            });
        }
        
        // 基于性能数据的建议
        const slowResources = this.performanceMetrics
            .filter(m => m.type === 'resource_load' && m.duration > 1000)
            .slice(0, 3);
        
        if (slowResources.length > 0) {
            suggestions.push({
                category: 'performance',
                priority: 'high',
                title: '优化资源加载性能',
                description: '优化加载缓慢的资源',
                details: slowResources.map(r => r.name).join(', ')
            });
        }
        
        return suggestions;
    }
    
    /**
     * 工具方法
     */
    getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.slice(0, 50),
            selector: this.getElementSelector(element)
        };
    }
    
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }
    
    isFormElement(element) {
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
    }
    
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }
    
    visualizeClick(x, y) {
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: fixed;
            left: ${x - 5}px;
            top: ${y - 5}px;
            width: 10px;
            height: 10px;
            background: red;
            border-radius: 50%;
            z-index: 10000;
            pointer-events: none;
            opacity: 0.7;
        `;
        document.body.appendChild(dot);
        
        setTimeout(() => dot.remove(), 2000);
    }
    
    recordDoubleClick(e) {
        this.recordError({
            type: 'double_click',
            element: this.getElementInfo(e.target),
            message: '用户进行了双击操作，可能表示单击响应不够明确',
            timestamp: Date.now()
        });
    }
    
    setupNetworkErrorTracking() {
        // 拦截fetch请求
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    this.recordError({
                        type: 'network',
                        status: response.status,
                        url: args[0],
                        timestamp: Date.now()
                    });
                }
                return response;
            } catch (error) {
                this.recordError({
                    type: 'network',
                    message: error.message,
                    url: args[0],
                    timestamp: Date.now()
                });
                throw error;
            }
        };
    }
    
    findCommonSequences(paths, length) {
        const sequences = new Map();
        
        for (let i = 0; i <= paths.length - length; i++) {
            const sequence = paths.slice(i, i + length)
                .map(p => p.element.selector)
                .join(' → ');
            
            sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
        }
        
        return Array.from(sequences.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([sequence, count]) => ({ sequence: sequence.split(' → '), count }));
    }
    
    identifyDropOffPoints() {
        // 简化的流失点识别逻辑
        const dropOffs = [];
        const pathCounts = new Map();
        
        this.clickPaths.forEach((path, index) => {
            if (index < this.clickPaths.length - 1) {
                const current = path.element.selector;
                const next = this.clickPaths[index + 1].element.selector;
                const key = `${current} → ${next}`;
                pathCounts.set(key, (pathCounts.get(key) || 0) + 1);
            }
        });
        
        // 找出转换率低的路径
        Array.from(pathCounts.entries()).forEach(([path, count]) => {
            if (count < 2) {
                dropOffs.push({ path, count });
            }
        });
        
        return dropOffs;
    }
    
    analyzeConversionFunnels() {
        // 简化的转化漏斗分析
        return [];
    }
    
    identifyAttentionZones() {
        // 基于滚动停留时间识别注意力区域
        const zones = [];
        let currentZone = null;
        
        this.scrollPatterns.forEach(pattern => {
            if (pattern.speed < 50) { // 慢速滚动表示注意力集中
                if (!currentZone) {
                    currentZone = {
                        startY: pattern.startY,
                        endY: pattern.endY,
                        duration: pattern.duration
                    };
                } else {
                    currentZone.endY = pattern.endY;
                    currentZone.duration += pattern.duration;
                }
            } else {
                if (currentZone && currentZone.duration > 1000) {
                    zones.push(currentZone);
                }
                currentZone = null;
            }
        });
        
        return zones;
    }
    
    groupFormInteractionsByForm() {
        const groups = {};
        
        this.formInteractions.forEach(interaction => {
            const formSelector = interaction.element.selector;
            if (!groups[formSelector]) {
                groups[formSelector] = [];
            }
            groups[formSelector].push(interaction);
        });
        
        return groups;
    }
    
    categorizeErrors() {
        const categories = {};
        
        this.errorPatterns.forEach(error => {
            const category = error.type || 'unknown';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(error);
        });
        
        return categories;
    }
    
    /**
     * 导出所有分析数据
     */
    exportAnalyticsData() {
        return {
            heatmapData: this.generateHeatmapData(),
            pathAnalysis: this.analyzeUserPaths(),
            scrollAnalysis: this.analyzeScrollBehavior(),
            formAnalysis: this.analyzeFormBehavior(),
            uxIssues: this.generateUXIssuesReport(),
            improvements: this.generateImprovementSuggestions(),
            rawData: {
                clicks: this.heatmapData.length,
                scrolls: this.scrollPatterns.length,
                formInteractions: this.formInteractions.length,
                errors: this.errorPatterns.length,
                performanceMetrics: this.performanceMetrics.length
            }
        };
    }
}

// 全局实例
window.userBehaviorAnalytics = new UserBehaviorAnalytics();