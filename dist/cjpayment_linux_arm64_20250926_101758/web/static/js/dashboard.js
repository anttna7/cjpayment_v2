/**
 * Dashboard Module
 * Handles dashboard functionality with card-based layout
 */

class DashboardModule {
  constructor() {
    this.charts = new Map();
    this.statsComponents = new Map();
    this.refreshInterval = null;
    this.isLoading = false;
    this.websocket = null;
    this.cardConfigs = new Map();
    this.searchIndex = new Map();
    this.cache = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    // Load user preferences
    this.loadUserPreferences();
    
    this.init();
  }
  
  /**
   * Cache utility methods
   */
  getCachedData(key) {
    return this.cache.get(key);
  }
  
  setCachedData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }
  
  isCacheExpired(cachedItem, maxAge) {
    return Date.now() - cachedItem.timestamp > maxAge;
  }
  
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Initialize dashboard with performance optimizations
   */
  init() {
    // Show loading state
    this.showLoadingState();
    
    // Initialize core components first
    this.setupEventListeners();
    this.initializeStatsCards();
    
    // Load critical data first
    this.loadDashboardData().then(() => {
      // Initialize charts after data is loaded
      this.initializeCharts();
      
      // Initialize secondary features
      this.initializeRealTimeUpdates();
      this.initializeCardPersonalization();
      this.initializeSearchFunctionality();
      this.setupExportModals();
      
      // Start auto refresh after everything is loaded
      this.startAutoRefresh();
      
      // Hide loading state
      this.hideLoadingState();
    }).catch(error => {
      console.error('Failed to initialize dashboard:', error);
      this.showErrorState('Failed to load dashboard data');
    });
  }
  
  /**
   * Show loading state
   */
  showLoadingState() {
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      dashboard.classList.add('dashboard--loading');
    }
    
    // Show skeleton loaders for cards
    const statsCards = document.querySelectorAll('.card--stat');
    statsCards.forEach(card => {
      card.classList.add('card--loading');
    });
  }
  
  /**
   * Hide loading state
   */
  hideLoadingState() {
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      dashboard.classList.remove('dashboard--loading');
    }
    
    // Hide skeleton loaders
    const statsCards = document.querySelectorAll('.card--stat');
    statsCards.forEach(card => {
      card.classList.remove('card--loading');
    });
  }
  
  /**
   * Show error state
   */
  showErrorState(message) {
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'dashboard__error';
      errorDiv.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <span class="error-text">${message}</span>
          <button class="btn btn-outline btn-sm" onclick="location.reload()">重试</button>
        </div>
      `;
      dashboard.prepend(errorDiv);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshDashboard());
    }
    
    // Export button
    const exportBtn = document.getElementById('exportDashboard');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDashboard());
    }
    
    // Quick actions
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(action => {
      action.addEventListener('click', (e) => {
        const actionType = e.currentTarget.getAttribute('data-action');
        this.handleQuickAction(actionType);
      });
    });
    
    // System status refresh
    const refreshSystemBtn = document.getElementById('refreshSystemStatus');
    if (refreshSystemBtn) {
      refreshSystemBtn.addEventListener('click', () => this.refreshSystemStatus());
    }
    
    // Chart period selectors
    const trendPeriodSelect = document.getElementById('trendPeriod');
    if (trendPeriodSelect) {
      trendPeriodSelect.addEventListener('change', (e) => {
        this.updateTrendChart(e.target.value);
      });
    }
    
    const statusChartTypeSelect = document.getElementById('statusChartType');
    if (statusChartTypeSelect) {
      statusChartTypeSelect.addEventListener('change', (e) => {
        this.updateStatusChart(e.target.value);
      });
    }
    
    // Export transactions
    const exportTransactionsBtn = document.getElementById('exportTransactions');
    if (exportTransactionsBtn) {
      exportTransactionsBtn.addEventListener('click', () => this.exportRecentTransactions());
    }
  }
  
  /**
   * Initialize statistics cards
   */
  initializeStatsCards() {
    // Total Transactions
    const totalTransactionsCard = new StatsComponent('#totalTransactionsCard .stat-card__value', {
      type: 'stat',
      format: 'number',
      animationDuration: 1000,
      value: 0
    });
    this.statsComponents.set('totalTransactions', totalTransactionsCard);
    
    // Total Amount
    const totalAmountCard = new StatsComponent('#totalAmountCard .stat-card__value', {
      type: 'stat',
      format: 'currency',
      animationDuration: 1000,
      value: 0
    });
    this.statsComponents.set('totalAmount', totalAmountCard);
    
    // Success Rate
    const successRateCard = new StatsComponent('#successRateCard .stat-card__value', {
      type: 'stat',
      format: 'percentage',
      decimals: 1,
      animationDuration: 1000,
      value: 0
    });
    this.statsComponents.set('successRate', successRateCard);
    
    // Average Amount
    const avgAmountCard = new StatsComponent('#avgAmountCard .stat-card__value', {
      type: 'stat',
      format: 'currency',
      animationDuration: 1000,
      value: 0
    });
    this.statsComponents.set('avgAmount', avgAmountCard);
  }
  
  /**
   * Initialize charts
   */
  initializeCharts() {
    this.initializeTrendChart();
    this.initializeStatusChart();
  }
  
  /**
   * Initialize trend chart
   */
  initializeTrendChart() {
    const trendChartContainer = document.querySelector('#trendChart');
    if (!trendChartContainer) return;
    
    const trendChart = new ChartComponent(trendChartContainer, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '交易数量',
          data: [],
          borderColor: 'var(--primary-500)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          fill: true,
          tension: 0.4
        }, {
          label: '交易金额',
          data: [],
          borderColor: 'var(--success-500)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '交易数量'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '交易金额 (¥)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 1) {
                  label += '¥' + context.parsed.y.toLocaleString();
                } else {
                  label += context.parsed.y.toLocaleString();
                }
                return label;
              }
            }
          }
        }
      }
    });
    
    this.charts.set('trend', trendChart);
  }
  
  /**
   * Initialize status chart
   */
  initializeStatusChart() {
    const statusChartContainer = document.querySelector('#statusChart');
    if (!statusChartContainer) return;
    
    const statusChart = new ChartComponent(statusChartContainer, {
      type: 'doughnut',
      data: {
        labels: ['已完成', '处理中', '失败', '已取消'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            'var(--success-500)',
            'var(--info-500)',
            'var(--error-500)',
            'var(--neutral-400)'
          ],
          borderWidth: 2,
          borderColor: 'var(--color-bg-surface)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    this.charts.set('status', statusChart);
  }
  
  /**
   * Load dashboard data with optimized parallel loading
   */
  async loadDashboardData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      // Load critical data in parallel for better performance
      const criticalPromises = [
        this.loadStatistics(),
        this.loadSystemStatus()
      ];
      
      // Load secondary data in parallel
      const secondaryPromises = [
        this.loadChartData(),
        this.loadRecentTransactions(),
        this.loadRecentActivity()
      ];
      
      // Wait for critical data first
      await Promise.allSettled(criticalPromises);
      
      // Then load secondary data
      await Promise.allSettled(secondaryPromises);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.showErrorState('数据加载失败');
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Load statistics data with caching
   */
  async loadStatistics() {
    try {
      // Check cache first
      const cacheKey = 'dashboard_statistics';
      const cachedData = this.getCachedData(cacheKey);
      
      if (cachedData && !this.isCacheExpired(cachedData, 60000)) { // 1 minute cache
        this.updateStatisticsUI(cachedData.data);
        return;
      }
      
      const response = await fetch('/api/v1/dashboard/statistics', {
        headers: {
          'Cache-Control': 'max-age=60'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Cache the data
        this.setCachedData(cacheKey, data.data);
        
        // Update UI
        this.updateStatisticsUI(data.data);
      } else {
        throw new Error(data.message || 'Failed to load statistics');
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
      this.showStatisticsError();
    }
  }
  
  /**
   * Update statistics UI
   */
  updateStatisticsUI(stats) {
    // Update statistics cards with animation
    this.statsComponents.get('totalTransactions')?.setValue(stats.totalTransactions || 0);
    this.statsComponents.get('totalAmount')?.setValue(stats.totalAmount || 0);
    this.statsComponents.get('successRate')?.setValue(stats.successRate || 0);
    this.statsComponents.get('avgAmount')?.setValue(stats.avgAmount || 0);
    
    // Update trend indicators
    this.updateTrendIndicators(stats.trends || {});
    
    // Update last updated time
    if (stats.metadata?.lastUpdated) {
      this.updateLastUpdatedTime(stats.metadata.lastUpdated);
    }
  }
  
  /**
   * Show statistics error state
   */
  showStatisticsError() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.classList.add('stats-grid--error');
      
      // Show error message in each stat card
      const statCards = statsGrid.querySelectorAll('.stat-card__value');
      statCards.forEach(card => {
        card.textContent = '--';
        card.classList.add('stat-card__value--error');
      });
    }
  }
  
  /**
   * Load chart data
   */
  async loadChartData() {
    try {
      const period = document.getElementById('trendPeriod')?.value || '30d';
      const response = await fetch(`/api/dashboard/charts?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        // Update trend chart
        const trendChart = this.charts.get('trend');
        if (trendChart && data.data.trend) {
          trendChart.updateData({
            labels: data.data.trend.labels,
            datasets: [{
              label: '交易数量',
              data: data.data.trend.transactions,
              borderColor: 'var(--primary-500)',
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              fill: true,
              tension: 0.4
            }, {
              label: '交易金额',
              data: data.data.trend.amounts,
              borderColor: 'var(--success-500)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true,
              tension: 0.4,
              yAxisID: 'y1'
            }]
          });
        }
        
        // Update status chart
        const statusChart = this.charts.get('status');
        if (statusChart && data.data.status) {
          statusChart.updateData({
            labels: ['已完成', '处理中', '失败', '已取消'],
            datasets: [{
              data: [
                data.data.status.completed || 0,
                data.data.status.processing || 0,
                data.data.status.failed || 0,
                data.data.status.cancelled || 0
              ],
              backgroundColor: [
                'var(--success-500)',
                'var(--info-500)',
                'var(--error-500)',
                'var(--neutral-400)'
              ],
              borderWidth: 2,
              borderColor: 'var(--color-bg-surface)'
            }]
          });
        }
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  }
  
  /**
   * Load recent transactions
   */
  async loadRecentTransactions() {
    try {
      const response = await fetch('/api/dashboard/recent-transactions?limit=10');
      const data = await response.json();
      
      if (data.success) {
        this.renderRecentTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
      this.showTransactionsError();
    }
  }
  
  /**
   * Load recent activity
   */
  async loadRecentActivity() {
    try {
      const response = await fetch('/api/dashboard/recent-activity?limit=5');
      const data = await response.json();
      
      if (data.success) {
        this.renderRecentActivity(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  }
  
  /**
   * Load system status
   */
  async loadSystemStatus() {
    try {
      const response = await fetch('/api/dashboard/system-status');
      const data = await response.json();
      
      if (data.success) {
        this.updateSystemStatus(data.data || {});
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  }
  
  /**
   * Update trend indicators
   */
  updateTrendIndicators(trends) {
    const indicators = [
      { id: 'totalTransactionsTrend', data: trends.transactions },
      { id: 'totalAmountTrend', data: trends.amount },
      { id: 'successRateTrend', data: trends.successRate },
      { id: 'avgAmountTrend', data: trends.avgAmount }
    ];
    
    indicators.forEach(({ id, data }) => {
      const element = document.getElementById(id);
      if (element && data) {
        const icon = element.querySelector('.trend-icon');
        const value = element.querySelector('.trend-value');
        
        if (icon && value) {
          const change = data.change || 0;
          const isPositive = change > 0;
          const isNegative = change < 0;
          
          icon.textContent = isPositive ? '↗️' : isNegative ? '↘️' : '➡️';
          value.textContent = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
          
          element.className = 'stat-card__trend';
          if (isPositive) element.classList.add('stat-card__trend--up');
          else if (isNegative) element.classList.add('stat-card__trend--down');
          else element.classList.add('stat-card__trend--neutral');
        }
      }
    });
  }
  
  /**
   * Render recent transactions
   */
  renderRecentTransactions(transactions) {
    const tbody = document.querySelector('#recentTransactionsTable tbody');
    if (!tbody) return;
    
    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table__empty">
            <div class="table__empty-icon">📋</div>
            <div>暂无交易记录</div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = transactions.map(transaction => `
      <tr>
        <td>
          <code class="text-sm">${transaction.orderNumber}</code>
        </td>
        <td>${transaction.payerName || '-'}</td>
        <td class="font-semibold">¥${transaction.amount.toLocaleString()}</td>
        <td>${transaction.merchantName || '-'}</td>
        <td>
          <span class="status-badge status-badge--${this.getStatusClass(transaction.status)}">
            ${this.getStatusText(transaction.status)}
          </span>
        </td>
        <td class="text-sm text-gray-600">
          ${new Date(transaction.createdAt).toLocaleString()}
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="dashboard.viewTransactionDetail('${transaction.id}')">
            查看
          </button>
        </td>
      </tr>
    `).join('');
  }
  
  /**
   * Render recent activity
   */
  renderRecentActivity(activities) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    if (activities.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          暂无活动记录
        </div>
      `;
      return;
    }
    
    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon activity-icon--${this.getActivityIconClass(activity.type)}">
          ${this.getActivityIcon(activity.type)}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-desc">${activity.description}</div>
          <div class="activity-time">${this.formatRelativeTime(activity.createdAt)}</div>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Update system status
   */
  updateSystemStatus(status) {
    const statusItems = [
      { id: 'dbStatus', key: 'database' },
      { id: 'cacheStatus', key: 'cache' },
      { id: 'queueStatus', key: 'queue' },
      { id: 'apiStatus', key: 'api' }
    ];
    
    statusItems.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element && status[key]) {
        const statusData = status[key];
        const statusClass = this.getSystemStatusClass(statusData.status);
        
        element.className = `status-indicator status-indicator--${statusClass}`;
        
        // Update status text
        const statusItem = element.closest('.status-item');
        const statusValue = statusItem?.querySelector('.status-value');
        if (statusValue) {
          statusValue.textContent = this.getSystemStatusText(statusData.status);
        }
      }
    });
  }
  
  /**
   * Handle quick actions
   */
  handleQuickAction(actionType) {
    switch (actionType) {
      case 'create-recharge':
        window.location.href = '/recharge/create';
        break;
      case 'view-reports':
        window.location.href = '/reports';
        break;
      case 'manage-accounts':
        window.location.href = '/accounts';
        break;
      case 'system-settings':
        window.location.href = '/settings';
        break;
      default:
        console.warn('Unknown quick action:', actionType);
    }
  }
  
  /**
   * Refresh dashboard
   */
  async refreshDashboard() {
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <span class="btn__icon">🔄</span>
        <span class="btn__text">刷新中...</span>
      `;
    }
    
    try {
      await this.loadDashboardData();
      
      // Show success message
      if (window.CJComponents && window.CJComponents.toast) {
        window.CJComponents.toast.success('数据已刷新');
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      if (window.CJComponents && window.CJComponents.toast) {
        window.CJComponents.toast.error('刷新失败');
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
          <span class="btn__icon">🔄</span>
          <span class="btn__text">刷新数据</span>
        `;
      }
    }
  }
  
  /**
   * Export dashboard - 显示导出模态框
   */
  async exportDashboard() {
    this.showDashboardExportModal();
  }

  /**
   * 显示仪表板导出模态框
   */
  showDashboardExportModal() {
    const modal = document.getElementById('exportDashboardModal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  /**
   * 实际执行导出操作
   */
  async performDashboardExport() {
    try {
      // 获取选择的格式和选项
      const format = document.querySelector('input[name="dashboardFormat"]:checked')?.value || 'excel';
      const timeRange = document.querySelector('input[name="dashboardTimeRange"]:checked')?.value || 'today';
      
      // 获取包含内容选项
      const includeOptions = {};
      document.querySelectorAll('#exportDashboardModal input[type="checkbox"]:checked').forEach(checkbox => {
        const label = checkbox.nextElementSibling.textContent;
        includeOptions[label] = true;
      });

      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: format,
          timeRange: timeRange,
          includeOptions: includeOptions
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 根据格式设置文件扩展名
        let extension = 'xlsx';
        if (format === 'pdf') extension = 'pdf';
        if (format === 'csv') extension = 'csv';
        
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.closeDashboardExportModal();
        
        if (window.CJComponents && window.CJComponents.toast) {
          window.CJComponents.toast.success('仪表板报表导出成功');
        }
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      if (window.CJComponents && window.CJComponents.toast) {
        window.CJComponents.toast.error('导出失败，请稍后重试');
      }
    }
  }

  /**
   * 关闭仪表板导出模态框
   */
  closeDashboardExportModal() {
    const modal = document.getElementById('exportDashboardModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }
  
  /**
   * Update trend chart
   */
  async updateTrendChart(period) {
    const trendChart = this.charts.get('trend');
    if (!trendChart) return;
    
    try {
      const response = await fetch(`/api/dashboard/charts?period=${period}`);
      const data = await response.json();
      
      if (data.success && data.data.trend) {
        trendChart.updateData({
          labels: data.data.trend.labels,
          datasets: [{
            label: '交易数量',
            data: data.data.trend.transactions,
            borderColor: 'var(--primary-500)',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4
          }, {
            label: '交易金额',
            data: data.data.trend.amounts,
            borderColor: 'var(--success-500)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
          }]
        });
      }
    } catch (error) {
      console.error('Failed to update trend chart:', error);
    }
  }
  
  /**
   * Update status chart
   */
  updateStatusChart(chartType) {
    const statusChart = this.charts.get('status');
    if (!statusChart) return;
    
    // Update chart type
    statusChart.chart.config.type = chartType;
    statusChart.chart.update();
  }
  
  /**
   * Refresh system status
   */
  async refreshSystemStatus() {
    const refreshBtn = document.getElementById('refreshSystemStatus');
    if (refreshBtn) {
      refreshBtn.disabled = true;
    }
    
    try {
      await this.loadSystemStatus();
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    } finally {
      if (refreshBtn) {
        refreshBtn.disabled = false;
      }
    }
  }
  
  /**
   * Export recent transactions - 显示导出模态框
   */
  async exportRecentTransactions() {
    this.showTransactionsExportModal();
  }

  /**
   * 显示交易导出模态框
   */
  showTransactionsExportModal() {
    const modal = document.getElementById('exportTransactionsModal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  /**
   * 实际执行交易导出操作
   */
  async performTransactionsExport() {
    try {
      // 获取选择的格式和选项
      const format = document.querySelector('input[name="transactionsFormat"]:checked')?.value || 'excel';
      const dataRange = document.querySelector('input[name="transactionsDataRange"]:checked')?.value || 'visible';
      
      // 获取包含内容选项
      const includeOptions = {};
      document.querySelectorAll('#exportTransactionsModal input[type="checkbox"]:checked').forEach(checkbox => {
        const label = checkbox.nextElementSibling.textContent;
        includeOptions[label] = true;
      });

      const response = await fetch('/api/dashboard/recent-transactions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: format,
          dataRange: dataRange,
          includeOptions: includeOptions
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 根据格式设置文件扩展名
        let extension = 'xlsx';
        if (format === 'pdf') extension = 'pdf';
        if (format === 'csv') extension = 'csv';
        
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.closeTransactionsExportModal();
        
        if (window.CJComponents && window.CJComponents.toast) {
          window.CJComponents.toast.success('交易记录导出成功');
        }
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Failed to export transactions:', error);
      if (window.CJComponents && window.CJComponents.toast) {
        window.CJComponents.toast.error('导出失败，请稍后重试');
      }
    }
  }

  /**
   * 关闭交易导出模态框
   */
  closeTransactionsExportModal() {
    const modal = document.getElementById('exportTransactionsModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }
  
  /**
   * View transaction detail
   */
  viewTransactionDetail(transactionId) {
    window.location.href = `/recharge/detail/${transactionId}`;
  }
  
  /**
   * Initialize real-time updates
   */
  initializeRealTimeUpdates() {
    // Setup WebSocket connection for real-time updates
    this.setupWebSocketConnection();
    
    // Setup auto-refresh with user preference
    const refreshInterval = this.getUserPreference('refreshInterval', 5); // minutes
    this.setAutoRefreshInterval(refreshInterval);
    
    // Add refresh interval selector
    this.addRefreshIntervalSelector();
  }
  
  /**
   * Setup WebSocket connection
   */
  setupWebSocketConnection() {
    if (!window.WebSocket) {
      console.warn('WebSocket not supported, falling back to polling');
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('Dashboard WebSocket connected');
        this.showConnectionStatus('connected');
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealTimeUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        this.showConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.setupWebSocketConnection();
        }, 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showConnectionStatus('error');
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  }
  
  /**
   * Handle real-time updates
   */
  handleRealTimeUpdate(data) {
    switch (data.type) {
      case 'stats_update':
        this.updateStatsInRealTime(data.payload);
        break;
      case 'new_transaction':
        this.handleNewTransaction(data.payload);
        break;
      case 'system_status_change':
        this.updateSystemStatusInRealTime(data.payload);
        break;
      case 'activity_update':
        this.addNewActivity(data.payload);
        break;
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  }
  
  /**
   * Update stats in real-time
   */
  updateStatsInRealTime(stats) {
    // Update statistics with smooth animations
    Object.entries(stats).forEach(([key, value]) => {
      const component = this.statsComponents.get(key);
      if (component) {
        component.animateToValue(value);
      }
    });
    
    // Show notification for significant changes
    if (stats.totalTransactions && stats.totalTransactions > this.lastTransactionCount) {
      const newTransactions = stats.totalTransactions - (this.lastTransactionCount || 0);
      if (newTransactions > 0) {
        this.showRealTimeNotification(`新增 ${newTransactions} 笔交易`, 'success');
      }
    }
    
    this.lastTransactionCount = stats.totalTransactions;
  }
  
  /**
   * Handle new transaction
   */
  handleNewTransaction(transaction) {
    // Add to recent transactions table
    this.prependTransactionToTable(transaction);
    
    // Update charts if needed
    this.updateChartsWithNewData(transaction);
    
    // Show notification
    this.showRealTimeNotification(
      `新交易: ¥${transaction.amount.toLocaleString()}`,
      'info'
    );
  }
  
  /**
   * Update system status in real-time
   */
  updateSystemStatusInRealTime(statusUpdate) {
    const { service, status, message } = statusUpdate;
    
    // Update status indicator
    const statusElement = document.getElementById(`${service}Status`);
    if (statusElement) {
      const statusClass = this.getSystemStatusClass(status);
      statusElement.className = `status-indicator status-indicator--${statusClass}`;
      
      // Update status text
      const statusItem = statusElement.closest('.status-item');
      const statusValue = statusItem?.querySelector('.status-value');
      if (statusValue) {
        statusValue.textContent = this.getSystemStatusText(status);
      }
    }
    
    // Show notification for critical status changes
    if (status === 'error' || status === 'warning') {
      this.showRealTimeNotification(
        `系统状态变更: ${message}`,
        status === 'error' ? 'error' : 'warning'
      );
    }
  }
  
  /**
   * Add new activity
   */
  addNewActivity(activity) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item activity-item--new';
    activityElement.innerHTML = `
      <div class="activity-icon activity-icon--${this.getActivityIconClass(activity.type)}">
        ${this.getActivityIcon(activity.type)}
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-desc">${activity.description}</div>
        <div class="activity-time">刚刚</div>
      </div>
    `;
    
    // Add with animation
    container.insertBefore(activityElement, container.firstChild);
    
    // Remove oldest activity if more than 5
    const activities = container.querySelectorAll('.activity-item');
    if (activities.length > 5) {
      activities[activities.length - 1].remove();
    }
    
    // Animate new activity
    setTimeout(() => {
      activityElement.classList.remove('activity-item--new');
    }, 100);
  }
  
  /**
   * Show real-time notification
   */
  showRealTimeNotification(message, type = 'info') {
    if (window.CJComponents && window.CJComponents.toast) {
      window.CJComponents.toast[type](message, {
        duration: 3000,
        position: 'top-right'
      });
    }
  }
  
  /**
   * Show connection status
   */
  showConnectionStatus(status) {
    const statusIndicator = document.getElementById('connectionStatus');
    if (!statusIndicator) {
      // Create connection status indicator
      this.createConnectionStatusIndicator();
      return;
    }
    
    const statusClasses = {
      'connected': 'status-indicator--success',
      'disconnected': 'status-indicator--warning',
      'error': 'status-indicator--error'
    };
    
    statusIndicator.className = `status-indicator ${statusClasses[status] || 'status-indicator--info'}`;
    
    const statusText = {
      'connected': '实时连接',
      'disconnected': '连接断开',
      'error': '连接错误'
    };
    
    const statusLabel = statusIndicator.nextElementSibling;
    if (statusLabel) {
      statusLabel.textContent = statusText[status] || '未知状态';
    }
  }
  
  /**
   * Create connection status indicator
   */
  createConnectionStatusIndicator() {
    const systemStatusCard = document.getElementById('systemStatusCard');
    if (!systemStatusCard) return;
    
    const statusContainer = systemStatusCard.querySelector('.system-status');
    if (!statusContainer) return;
    
    const connectionStatus = document.createElement('div');
    connectionStatus.className = 'status-item';
    connectionStatus.innerHTML = `
      <div class="status-indicator status-indicator--info" id="connectionStatus"></div>
      <div class="status-content">
        <div class="status-label">实时连接</div>
        <div class="status-value">连接中...</div>
      </div>
    `;
    
    statusContainer.appendChild(connectionStatus);
  }
  
  /**
   * Add refresh interval selector
   */
  addRefreshIntervalSelector() {
    const dashboardActions = document.querySelector('.dashboard__actions');
    if (!dashboardActions) return;
    
    const refreshSelector = document.createElement('select');
    refreshSelector.className = 'form-select form-select--sm';
    refreshSelector.id = 'refreshIntervalSelector';
    refreshSelector.innerHTML = `
      <option value="1">1分钟</option>
      <option value="5" selected>5分钟</option>
      <option value="10">10分钟</option>
      <option value="30">30分钟</option>
      <option value="0">关闭自动刷新</option>
    `;
    
    // Set current value
    const currentInterval = this.getUserPreference('refreshInterval', 5);
    refreshSelector.value = currentInterval;
    
    refreshSelector.addEventListener('change', (e) => {
      const interval = parseInt(e.target.value);
      this.setAutoRefreshInterval(interval);
      this.saveUserPreference('refreshInterval', interval);
    });
    
    // Add label
    const label = document.createElement('label');
    label.className = 'form-label form-label--inline';
    label.textContent = '刷新间隔:';
    label.appendChild(refreshSelector);
    
    dashboardActions.insertBefore(label, dashboardActions.firstChild);
  }
  
  /**
   * Set auto refresh interval
   */
  setAutoRefreshInterval(minutes) {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    // Set new interval if not disabled
    if (minutes > 0) {
      this.refreshInterval = setInterval(() => {
        this.loadDashboardData();
      }, minutes * 60 * 1000);
    }
  }
  
  /**
   * Initialize card personalization
   */
  initializeCardPersonalization() {
    // Add personalization controls to cards
    this.addCardPersonalizationControls();
    
    // Load saved card configurations
    this.loadCardConfigurations();
    
    // Setup drag and drop for card reordering
    this.setupCardReordering();
  }
  
  /**
   * Add card personalization controls
   */
  addCardPersonalizationControls() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      const cardHeader = card.querySelector('.card__header');
      if (!cardHeader) return;
      
      const cardActions = cardHeader.querySelector('.card__actions') || this.createCardActions(cardHeader);
      
      // Add personalization menu
      const personalizationBtn = document.createElement('button');
      personalizationBtn.className = 'btn btn-sm btn-ghost card-personalization-btn';
      personalizationBtn.innerHTML = '⚙️';
      personalizationBtn.title = '个性化设置';
      
      personalizationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCardPersonalizationMenu(card);
      });
      
      cardActions.appendChild(personalizationBtn);
    });
  }
  
  /**
   * Create card actions container
   */
  createCardActions(cardHeader) {
    const cardActions = document.createElement('div');
    cardActions.className = 'card__actions';
    cardHeader.appendChild(cardActions);
    return cardActions;
  }
  
  /**
   * Show card personalization menu
   */
  showCardPersonalizationMenu(card) {
    const cardId = card.id;
    const cardConfig = this.getCardConfig(cardId);
    
    // Create personalization modal
    const modal = document.createElement('div');
    modal.className = 'modal modal--personalization';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">卡片个性化设置</h3>
          <button class="modal-close" type="button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">显示设置</label>
            <div class="form-check">
              <input type="checkbox" id="cardVisible" class="form-check-input" ${cardConfig.visible !== false ? 'checked' : ''}>
              <label for="cardVisible" class="form-check-label">显示此卡片</label>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">刷新频率</label>
            <select class="form-select" id="cardRefreshRate">
              <option value="0" ${cardConfig.refreshRate === 0 ? 'selected' : ''}>跟随全局设置</option>
              <option value="30" ${cardConfig.refreshRate === 30 ? 'selected' : ''}>30秒</option>
              <option value="60" ${cardConfig.refreshRate === 60 ? 'selected' : ''}>1分钟</option>
              <option value="300" ${cardConfig.refreshRate === 300 ? 'selected' : ''}>5分钟</option>
            </select>
          </div>
          
          <div class="form-group" id="cardSpecificSettings">
            <!-- Card-specific settings will be added here -->
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="cancelPersonalization">取消</button>
          <button class="btn btn-primary" id="savePersonalization">保存设置</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add card-specific settings
    this.addCardSpecificSettings(cardId, modal.querySelector('#cardSpecificSettings'));
    
    // Setup event listeners
    this.setupPersonalizationModalEvents(modal, cardId);
    
    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);
  }
  
  /**
   * Add card-specific settings
   */
  addCardSpecificSettings(cardId, container) {
    const cardConfig = this.getCardConfig(cardId);
    
    switch (cardId) {
      case 'trendChartCard':
        container.innerHTML = `
          <label class="form-label">默认时间范围</label>
          <select class="form-select" id="defaultPeriod">
            <option value="7d" ${cardConfig.defaultPeriod === '7d' ? 'selected' : ''}>近7天</option>
            <option value="30d" ${cardConfig.defaultPeriod === '30d' ? 'selected' : ''}>近30天</option>
            <option value="90d" ${cardConfig.defaultPeriod === '90d' ? 'selected' : ''}>近90天</option>
          </select>
        `;
        break;
        
      case 'statusChartCard':
        container.innerHTML = `
          <label class="form-label">默认图表类型</label>
          <select class="form-select" id="defaultChartType">
            <option value="doughnut" ${cardConfig.defaultChartType === 'doughnut' ? 'selected' : ''}>环形图</option>
            <option value="pie" ${cardConfig.defaultChartType === 'pie' ? 'selected' : ''}>饼图</option>
          </select>
        `;
        break;
        
      case 'recentTransactionsCard':
        container.innerHTML = `
          <label class="form-label">显示行数</label>
          <select class="form-select" id="transactionLimit">
            <option value="5" ${cardConfig.transactionLimit === 5 ? 'selected' : ''}>5行</option>
            <option value="10" ${cardConfig.transactionLimit === 10 ? 'selected' : ''}>10行</option>
            <option value="20" ${cardConfig.transactionLimit === 20 ? 'selected' : ''}>20行</option>
          </select>
        `;
        break;
        
      default:
        container.innerHTML = '<p class="text-sm text-gray-500">此卡片暂无特殊设置选项</p>';
    }
  }
  
  /**
   * Setup personalization modal events
   */
  setupPersonalizationModalEvents(modal, cardId) {
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('#cancelPersonalization');
    const saveBtn = modal.querySelector('#savePersonalization');
    const backdrop = modal.querySelector('.modal-backdrop');
    
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    saveBtn.addEventListener('click', () => {
      this.saveCardPersonalization(modal, cardId);
      closeModal();
    });
  }
  
  /**
   * Save card personalization
   */
  saveCardPersonalization(modal, cardId) {
    const config = {
      visible: modal.querySelector('#cardVisible').checked,
      refreshRate: parseInt(modal.querySelector('#cardRefreshRate').value)
    };
    
    // Add card-specific settings
    const specificSettings = modal.querySelector('#cardSpecificSettings');
    const inputs = specificSettings.querySelectorAll('select, input');
    
    inputs.forEach(input => {
      if (input.id) {
        config[input.id] = input.type === 'checkbox' ? input.checked : input.value;
      }
    });
    
    // Save configuration
    this.setCardConfig(cardId, config);
    this.saveCardConfigurations();
    
    // Apply configuration
    this.applyCardConfiguration(cardId, config);
    
    // Show success message
    if (window.CJComponents && window.CJComponents.toast) {
      window.CJComponents.toast.success('卡片设置已保存');
    }
  }
  
  /**
   * Apply card configuration
   */
  applyCardConfiguration(cardId, config) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Apply visibility
    if (config.visible === false) {
      card.style.display = 'none';
    } else {
      card.style.display = '';
    }
    
    // Apply card-specific configurations
    switch (cardId) {
      case 'trendChartCard':
        if (config.defaultPeriod) {
          const periodSelect = document.getElementById('trendPeriod');
          if (periodSelect) {
            periodSelect.value = config.defaultPeriod;
            this.updateTrendChart(config.defaultPeriod);
          }
        }
        break;
        
      case 'statusChartCard':
        if (config.defaultChartType) {
          const chartTypeSelect = document.getElementById('statusChartType');
          if (chartTypeSelect) {
            chartTypeSelect.value = config.defaultChartType;
            this.updateStatusChart(config.defaultChartType);
          }
        }
        break;
        
      case 'recentTransactionsCard':
        if (config.transactionLimit) {
          // Reload transactions with new limit
          this.loadRecentTransactions(config.transactionLimit);
        }
        break;
    }
  }
  
  /**
   * Setup card reordering
   */
  setupCardReordering() {
    // This would implement drag-and-drop functionality
    // For now, we'll add a simple reorder interface
    this.addCardReorderInterface();
  }
  
  /**
   * Add card reorder interface
   */
  addCardReorderInterface() {
    const dashboardActions = document.querySelector('.dashboard__actions');
    if (!dashboardActions) return;
    
    const reorderBtn = document.createElement('button');
    reorderBtn.className = 'btn btn-outline';
    reorderBtn.innerHTML = `
      <span class="btn__icon">🔄</span>
      <span class="btn__text">重新排列</span>
    `;
    
    reorderBtn.addEventListener('click', () => {
      this.showCardReorderInterface();
    });
    
    dashboardActions.appendChild(reorderBtn);
  }
  
  /**
   * Show card reorder interface
   */
  showCardReorderInterface() {
    // Implementation for card reordering interface
    if (window.CJComponents && window.CJComponents.toast) {
      window.CJComponents.toast.info('卡片重新排列功能即将推出');
    }
  }
  
  /**
   * Initialize search functionality
   */
  initializeSearchFunctionality() {
    // Add search interface
    this.addSearchInterface();
    
    // Build search index
    this.buildSearchIndex();
    
    // Setup search shortcuts
    this.setupSearchShortcuts();
  }
  
  /**
   * Add search interface
   */
  addSearchInterface() {
    const dashboardHeader = document.querySelector('.dashboard__header');
    if (!dashboardHeader) return;
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'dashboard__search';
    searchContainer.innerHTML = `
      <div class="search-input-group">
        <input type="text" class="form-input search-input" placeholder="搜索功能、数据或操作..." id="dashboardSearch">
        <button class="btn btn-ghost search-btn" id="searchBtn">
          <span class="btn__icon">🔍</span>
        </button>
      </div>
      <div class="search-results" id="searchResults" style="display: none;"></div>
    `;
    
    // Insert search after title
    const dashboardTitle = dashboardHeader.querySelector('.dashboard__title');
    dashboardTitle.parentNode.insertBefore(searchContainer, dashboardTitle.nextSibling);
    
    // Setup search events
    this.setupSearchEvents();
  }
  
  /**
   * Setup search events
   */
  setupSearchEvents() {
    const searchInput = document.getElementById('dashboardSearch');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
      }
      
      searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query) {
          this.performSearch(query);
        }
      } else if (e.key === 'Escape') {
        searchResults.style.display = 'none';
        searchInput.blur();
      }
    });
    
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.performSearch(query);
      }
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
  }
  
  /**
   * Build search index
   */
  buildSearchIndex() {
    // Index quick actions
    const quickActions = document.querySelectorAll('.quick-action');
    quickActions.forEach(action => {
      const title = action.querySelector('.quick-action__title')?.textContent;
      const desc = action.querySelector('.quick-action__desc')?.textContent;
      const actionType = action.getAttribute('data-action');
      
      if (title) {
        this.searchIndex.set(title.toLowerCase(), {
          type: 'action',
          title,
          description: desc,
          action: () => this.handleQuickAction(actionType),
          element: action
        });
      }
    });
    
    // Index navigation items
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const title = link.textContent.trim();
      const href = link.getAttribute('href');
      
      if (title && href) {
        this.searchIndex.set(title.toLowerCase(), {
          type: 'navigation',
          title,
          description: `导航到 ${title}`,
          action: () => window.location.href = href,
          element: link
        });
      }
    });
    
    // Index cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      const title = card.querySelector('.card__title')?.textContent;
      
      if (title) {
        this.searchIndex.set(title.toLowerCase(), {
          type: 'card',
          title,
          description: `查看 ${title}`,
          action: () => this.scrollToCard(card),
          element: card
        });
      }
    });
    
    // Index common operations
    const commonOperations = [
      { key: '刷新', title: '刷新数据', description: '刷新仪表板数据', action: () => this.refreshDashboard() },
      { key: '导出', title: '导出报表', description: '导出仪表板报表', action: () => this.exportDashboard() },
      { key: '设置', title: '系统设置', description: '打开系统设置', action: () => window.location.href = '/settings' },
      { key: '帮助', title: '帮助文档', description: '查看帮助文档', action: () => window.open('/help', '_blank') }
    ];
    
    commonOperations.forEach(op => {
      this.searchIndex.set(op.key, op);
    });
  }
  
  /**
   * Perform search
   */
  performSearch(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search in index
    this.searchIndex.forEach((item, key) => {
      if (key.includes(queryLower) || 
          item.title.toLowerCase().includes(queryLower) ||
          (item.description && item.description.toLowerCase().includes(queryLower))) {
        results.push(item);
      }
    });
    
    // Display results
    this.displaySearchResults(results, query);
  }
  
  /**
   * Display search results
   */
  displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <div class="search-no-results__icon">🔍</div>
          <div class="search-no-results__text">未找到相关结果</div>
          <div class="search-no-results__suggestion">尝试使用其他关键词</div>
        </div>
      `;
    } else {
      searchResults.innerHTML = results.map(result => `
        <div class="search-result-item" data-type="${result.type}">
          <div class="search-result-icon">${this.getSearchResultIcon(result.type)}</div>
          <div class="search-result-content">
            <div class="search-result-title">${this.highlightSearchTerm(result.title, query)}</div>
            <div class="search-result-desc">${this.highlightSearchTerm(result.description || '', query)}</div>
          </div>
        </div>
      `).join('');
      
      // Add click handlers
      searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
        item.addEventListener('click', () => {
          results[index].action();
          searchResults.style.display = 'none';
          document.getElementById('dashboardSearch').value = '';
        });
      });
    }
    
    searchResults.style.display = 'block';
  }
  
  /**
   * Get search result icon
   */
  getSearchResultIcon(type) {
    const icons = {
      'action': '⚡',
      'navigation': '🧭',
      'card': '📊',
      'operation': '🔧'
    };
    return icons[type] || '📄';
  }
  
  /**
   * Highlight search term
   */
  highlightSearchTerm(text, term) {
    if (!text || !term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * Scroll to card
   */
  scrollToCard(card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight card briefly
    card.classList.add('card--highlighted');
    setTimeout(() => {
      card.classList.remove('card--highlighted');
    }, 2000);
  }
  
  /**
   * Setup search shortcuts
   */
  setupSearchShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('dashboardSearch');
        if (searchInput) {
          searchInput.focus();
        }
      }
    });
  }
  
  /**
   * User preferences management
   */
  loadUserPreferences() {
    try {
      const preferences = localStorage.getItem('dashboard_preferences');
      this.userPreferences = preferences ? JSON.parse(preferences) : {};
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      this.userPreferences = {};
    }
  }
  
  saveUserPreferences() {
    try {
      localStorage.setItem('dashboard_preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }
  
  getUserPreference(key, defaultValue) {
    return this.userPreferences[key] !== undefined ? this.userPreferences[key] : defaultValue;
  }
  
  saveUserPreference(key, value) {
    this.userPreferences[key] = value;
    this.saveUserPreferences();
  }
  
  /**
   * Card configuration management
   */
  loadCardConfigurations() {
    try {
      const configs = localStorage.getItem('dashboard_card_configs');
      const parsedConfigs = configs ? JSON.parse(configs) : {};
      
      Object.entries(parsedConfigs).forEach(([cardId, config]) => {
        this.cardConfigs.set(cardId, config);
        this.applyCardConfiguration(cardId, config);
      });
    } catch (error) {
      console.error('Failed to load card configurations:', error);
    }
  }
  
  saveCardConfigurations() {
    try {
      const configs = {};
      this.cardConfigs.forEach((config, cardId) => {
        configs[cardId] = config;
      });
      localStorage.setItem('dashboard_card_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save card configurations:', error);
    }
  }
  
  getCardConfig(cardId) {
    return this.cardConfigs.get(cardId) || {};
  }
  
  setCardConfig(cardId, config) {
    this.cardConfigs.set(cardId, config);
  }
  
  /**
   * Start auto refresh
   */
  startAutoRefresh() {
    // This method is now handled by setAutoRefreshInterval
    const refreshInterval = this.getUserPreference('refreshInterval', 5);
    this.setAutoRefreshInterval(refreshInterval);
  }
  
  /**
   * Stop auto refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Show loading state
   */
  showLoadingState() {
    // Add loading class to cards
    document.querySelectorAll('.card').forEach(card => {
      card.classList.add('card--loading');
    });
  }
  
  /**
   * Hide loading state
   */
  hideLoadingState() {
    // Remove loading class from cards
    document.querySelectorAll('.card').forEach(card => {
      card.classList.remove('card--loading');
    });
  }
  
  /**
   * Show error state
   */
  showErrorState(message) {
    if (window.CJComponents && window.CJComponents.toast) {
      window.CJComponents.toast.error(message);
    }
  }
  
  /**
   * Show transactions error
   */
  showTransactionsError() {
    const tbody = document.querySelector('#recentTransactionsTable tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table__empty">
            <div class="table__empty-icon">⚠️</div>
            <div>数据加载失败</div>
            <button class="btn btn-sm btn-outline mt-2" onclick="dashboard.loadRecentTransactions()">
              重试
            </button>
          </td>
        </tr>
      `;
    }
  }
  
  /**
   * Utility methods
   */
  getStatusClass(status) {
    const statusMap = {
      'completed': 'success',
      'processing': 'info',
      'pending': 'pending',
      'failed': 'error',
      'cancelled': 'warning'
    };
    return statusMap[status] || 'pending';
  }
  
  getStatusText(status) {
    const statusMap = {
      'completed': '已完成',
      'processing': '处理中',
      'pending': '待处理',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知';
  }
  
  getActivityIconClass(type) {
    const typeMap = {
      'transaction': 'success',
      'merchant': 'info',
      'account': 'warning',
      'system': 'info',
      'error': 'error'
    };
    return typeMap[type] || 'info';
  }
  
  getActivityIcon(type) {
    const iconMap = {
      'transaction': '✅',
      'merchant': '📝',
      'account': '⚠️',
      'system': 'ℹ️',
      'error': '❌'
    };
    return iconMap[type] || 'ℹ️';
  }
  
  getSystemStatusClass(status) {
    const statusMap = {
      'healthy': 'success',
      'warning': 'warning',
      'error': 'error',
      'unknown': 'info'
    };
    return statusMap[status] || 'info';
  }
  
  getSystemStatusText(status) {
    const statusMap = {
      'healthy': '正常',
      'warning': '警告',
      'error': '错误',
      'unknown': '未知'
    };
    return statusMap[status] || '未知';
  }
  
  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString();
  }
  
  /**
   * Helper methods for real-time updates
   */
  prependTransactionToTable(transaction) {
    const tbody = document.querySelector('#recentTransactionsTable tbody');
    if (!tbody) return;
    
    const newRow = document.createElement('tr');
    newRow.className = 'table-row--new';
    newRow.innerHTML = `
      <td>
        <code class="text-sm">${transaction.orderNumber}</code>
      </td>
      <td>${transaction.payerName || '-'}</td>
      <td class="font-semibold">¥${transaction.amount.toLocaleString()}</td>
      <td>${transaction.merchantName || '-'}</td>
      <td>
        <span class="status-badge status-badge--${this.getStatusClass(transaction.status)}">
          ${this.getStatusText(transaction.status)}
        </span>
      </td>
      <td class="text-sm text-gray-600">
        ${new Date(transaction.createdAt).toLocaleString()}
      </td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="dashboard.viewTransactionDetail('${transaction.id}')">
          查看
        </button>
      </td>
    `;
    
    // Remove loading row if exists
    const loadingRow = tbody.querySelector('.table__loading');
    if (loadingRow) {
      loadingRow.remove();
    }
    
    // Add new row at the top
    tbody.insertBefore(newRow, tbody.firstChild);
    
    // Remove oldest row if more than 10
    const rows = tbody.querySelectorAll('tr:not(.table__loading):not(.table__empty)');
    if (rows.length > 10) {
      rows[rows.length - 1].remove();
    }
    
    // Animate new row
    setTimeout(() => {
      newRow.classList.remove('table-row--new');
    }, 100);
  }
  
  /**
   * Update charts with new data
   */
  updateChartsWithNewData(transaction) {
    // This would update charts with the new transaction data
    // Implementation depends on the specific chart update requirements
    console.log('Updating charts with new transaction:', transaction);
  }
  
  /**
   * Load recent transactions with limit
   */
  async loadRecentTransactions(limit = 10) {
    try {
      const response = await fetch(`/api/dashboard/recent-transactions?limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        this.renderRecentTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
      this.showTransactionsError();
    }
  }
  
  /**
   * Setup export modals event listeners
   */
  setupExportModals() {
    // Dashboard export modal events
    const confirmDashboardExportBtn = document.getElementById('confirmDashboardExportBtn');
    const cancelDashboardExportBtn = document.getElementById('cancelDashboardExportBtn');
    const dashboardExportClose = document.querySelector('#exportDashboardModal .modal-close');
    
    if (confirmDashboardExportBtn) {
      confirmDashboardExportBtn.addEventListener('click', () => {
        this.performDashboardExport();
      });
    }
    
    if (cancelDashboardExportBtn) {
      cancelDashboardExportBtn.addEventListener('click', () => {
        this.closeDashboardExportModal();
      });
    }
    
    if (dashboardExportClose) {
      dashboardExportClose.addEventListener('click', () => {
        this.closeDashboardExportModal();
      });
    }
    
    // Transactions export modal events
    const confirmTransactionsExportBtn = document.getElementById('confirmTransactionsExportBtn');
    const cancelTransactionsExportBtn = document.getElementById('cancelTransactionsExportBtn');
    const transactionsExportClose = document.querySelector('#exportTransactionsModal .modal-close');
    
    if (confirmTransactionsExportBtn) {
      confirmTransactionsExportBtn.addEventListener('click', () => {
        this.performTransactionsExport();
      });
    }
    
    if (cancelTransactionsExportBtn) {
      cancelTransactionsExportBtn.addEventListener('click', () => {
        this.closeTransactionsExportModal();
      });
    }
    
    if (transactionsExportClose) {
      transactionsExportClose.addEventListener('click', () => {
        this.closeTransactionsExportModal();
      });
    }
    
    // Global modal close handlers (click outside or ESC key)
    this.setupGlobalModalHandlers();
  }
  
  /**
   * Setup global modal close handlers
   */
  setupGlobalModalHandlers() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      const dashboardModal = document.getElementById('exportDashboardModal');
      const transactionsModal = document.getElementById('exportTransactionsModal');
      
      if (dashboardModal && e.target === dashboardModal) {
        this.closeDashboardExportModal();
      }
      
      if (transactionsModal && e.target === transactionsModal) {
        this.closeTransactionsExportModal();
      }
    });
    
    // Close modals with ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const dashboardModal = document.getElementById('exportDashboardModal');
        const transactionsModal = document.getElementById('exportTransactionsModal');
        
        if (dashboardModal && dashboardModal.classList.contains('show')) {
          this.closeDashboardExportModal();
        }
        
        if (transactionsModal && transactionsModal.classList.contains('show')) {
          this.closeTransactionsExportModal();
        }
      }
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoRefresh();
    
    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Destroy charts
    this.charts.forEach(chart => {
      if (chart.destroy) {
        chart.destroy();
      }
    });
    this.charts.clear();
    
    // Destroy stats components
    this.statsComponents.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.statsComponents.clear();
    
    // Clear search index
    this.searchIndex.clear();
    
    // Clear card configs
    this.cardConfigs.clear();
  }
}

// Export for global use
window.DashboardModule = DashboardModule;

// Auto-initialize if not already done
document.addEventListener('DOMContentLoaded', function() {
  if (!window.dashboard && document.querySelector('.dashboard')) {
    window.dashboard = new DashboardModule();
  }
});