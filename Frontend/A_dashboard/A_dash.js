document.addEventListener('DOMContentLoaded', async function () {
    // 1. Auth Guard for Admin
    const authUser = JSON.parse(sessionStorage.getItem('authUser'));
    if (!authUser || authUser.role !== 'ADMIN') {
        showCustomAlert('Access denied. Administrator privileges required.', 'Access Denied', 'error').then(() => {
            window.location.href = '../gate/gate.html';
        });
        return;
    }

    // 2. Map UI - User Info
    const initials = sessionStorage.getItem('userInitials') || 'AD';
    const fullName = authUser.full_name || sessionStorage.getItem('currentUser') || 'Admin';

    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.getElementById('dropdownName');
    const dropdownStrong = document.querySelector('.dropdown-header strong');

    if (avatarElement) avatarElement.innerText = initials;
    if (dropdownName) dropdownName.innerText = fullName;
    if (dropdownStrong) dropdownStrong.innerText = fullName;

    // 3. Dropdown toggle
    const dropdown = document.getElementById('userDropdown');
    if (avatarElement && dropdown) {
        avatarElement.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!avatarElement.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // 4. Button Events
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadDashboardData);

    // 5. Setup KPI Card Interactions
    document.querySelectorAll('.kpi-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function () {
            const titleEl = this.querySelector('.kpi-title');
            if (!titleEl) return;
            const title = titleEl.innerText;
            if (title === 'CRITICAL ISSUES') {
                window.location.href = '../list/O_list.html?filter=priority%3DHigh';
            } else if (title === 'TOTAL ORDERS') {
                window.location.href = '../list/O_list.html';
            } else if (title === 'ACTIVE ORDERS') {
                window.location.href = '../list/O_list.html?filter=Active';
            }
        });
    });

    // 6. Initial load & Auto-refresh
    await loadDashboardData();
    const refreshInterval = setInterval(loadDashboardData, 30000);
    window.addEventListener('unload', () => clearInterval(refreshInterval));
});


async function loadDashboardData() {
    updateSyncTime();

    try {
        const response = await apiGet('/orders/stats');
        const stats = response.data;

        if (!stats || stats.kpi.totalOrders === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('dashboardContent').style.display = 'none';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';

        renderDashboard(stats);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function renderDashboard(stats) {
    // === KPI Cards (directly from backend, no client recalculation) ===
    const kpi = stats.kpi;

    document.getElementById('totalOrders').innerText = kpi.totalOrders.toLocaleString();
    const activePct = kpi.totalOrders > 0 ? Math.round((kpi.activeOrders / kpi.totalOrders) * 100) : 0;
    const kpiTotalSub = document.getElementById('kpiTotalSub');
    kpiTotalSub.innerText = ``;
    kpiTotalSub.className = 'kpi-trend text-muted';

    document.getElementById('kpiInProgress').innerText = kpi.activeOrders.toLocaleString();

    const kpiActiveSub = document.getElementById('kpiActiveSub');
    kpiActiveSub.innerText = ``;
    kpiActiveSub.className = 'kpi-trend text-success';
    const criticalCount = (kpi.highPriorityCount || 0) + (kpi.overdueCount || 0);
    document.getElementById('kpiDelayed').innerText = criticalCount.toLocaleString();
    document.getElementById('kpiDelayedSub').innerText = ``;
    document.getElementById('kpiCycleTime').innerText = kpi.avgCycleTime;
    document.getElementById('kpiCycleSub').innerText = ``;

    // === Charts ===
    // Status Breakdown Chart
    renderStatusDetailedChart(stats.statusCounts);

    // Order Volume Trend (use trend data from backend)
    renderTrendChartFromStats(stats.trend);

    // Bottleneck Analysis
    renderBottleneckChart(stats.bottleneck);

    // Workload Distribution
    renderWorkloadChart(stats.workload);

    // === Alerts (Red for overdue, Orange for high priority) ===
    renderAlerts(stats.alerts);

    // === Recent Activity (Pass alerts count to align heights) ===
    renderActivity(stats.activity, stats.alerts.length);
}


// Colors mapping
const STATUS_COLORS = {
    'awaiting approval': '#f9a825',
    'preparing': '#1976d2',
    'qc checking': '#7b1fa2',
    'shipping': '#ef6c00',
    'awaiting invoice': '#cddc39',
    'rejected': '#c62828',
    'completed': '#1b5e20'
};


function renderAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    const badge = document.getElementById('liveIssuesBadge');
    if (!container) return;

    // Filter and calculate final priority for each alert using shared logic
    const processedAlerts = alerts.map(o => {
        const result = getOrderPriority(o);
        return { ...o, ...result };
    }).filter(o => o.priority === 'High' || o.priority === 'Overdue');

    badge.innerText = `${processedAlerts.length} LIVE ISSUES`;

    if (processedAlerts.length === 0) {
        container.innerHTML = `
            <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; text-align: center; border: 1px dashed #ddd;">
                <i class="fas fa-check-circle" style="color: #52c41a; font-size: 24px; margin-bottom: 10px;"></i>
                <p style="color: #666; font-size: 13px; margin: 0;">Excellent! No critical delays detected.</p>
            </div>`;
        return;
    }

    container.innerHTML = processedAlerts.map(o => {
        const isOverdue = o.priority === 'Overdue';
        const isHighOnly = o.priority === 'High';

        let type = 'Processing delay';
        let icon = 'fa-user-cog';
        if (['DRAFT', 'AWAITING_APPROVAL', 'CONFIRMED'].includes(o.status)) icon = 'fa-handshake';
        else if (['PREPARING', 'QC', 'SHIPPING'].includes(o.status)) icon = 'fa-tools';
        else if (o.status === 'AWAITING_INVOICE') icon = 'fa-warehouse';

        let level = isOverdue ? 'danger-box' : 'warning-box';

        if (isOverdue) {
            if (o.status === 'QC') type = 'QC Checking Bottleneck';
            else if (o.status === 'SHIPPING') type = 'Logistics Overdue';
            else if (o.status === 'AWAITING_INVOICE') type = 'Invoicing Overdue';
            else if (o.status === 'AWAITING_APPROVAL') type = 'Approval Overdue';
            else if (o.status === 'PREPARING') type = 'Preparing Overdue';
            else type = 'Delivery Overdue';
        } else if (isHighOnly) {
            let taskType = 'Task';
            if (o.status === 'AWAITING_APPROVAL') taskType = 'Approval';
            else if (o.status === 'PREPARING') taskType = 'Preparing';
            else if (o.status === 'QC') taskType = 'QC Checking';
            else if (o.status === 'SHIPPING') taskType = 'Shipping';
            else if (o.status === 'AWAITING_INVOICE') taskType = 'Invoicing';
            
            type = `${taskType} Task Approaching Deadline`;
        }

        const orderDisplayId = `#${o.order_code || o.id}`;

        return `
            <div class="alert-box ${level}">
                <div class="alert-box-icon"><i class="fas ${icon}"></i></div>
                <div class="alert-box-content">
                    <div class="alert-box-header">
                        <strong>${orderDisplayId} - ${type}</strong>
                        <span>${getTimeAgo(o.updated_at)}</span>
                    </div>
                    <p>${o.customer_name || 'Customer'}</p>
                    <div class="alert-box-actions">
                        <button class="${isOverdue ? 'btn-danger-solid' : 'btn-warning-solid'}" onclick="sessionStorage.setItem('currentOrderId', '${o.id}'); window.location.href='../detail/detail.html'">View Detail</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

let allActivitiesGlob = [];
let showingAllActivities = false;
let lastAlertCountGlob = 5;

function renderActivity(activities, alertCount) {
    if (activities) allActivitiesGlob = activities;
    if (alertCount !== undefined) lastAlertCountGlob = alertCount;
    
    const container = document.getElementById('activityHistory');
    if (!container) return;

    // Use alert count * 1.5 to match the height, minimum 3
    const defaultCount = Math.max(3, Math.ceil(lastAlertCountGlob * 1.5));
    const showCount = showingAllActivities ? allActivitiesGlob.length : defaultCount;
    const toRender = allActivitiesGlob.slice(0, showCount);

    container.innerHTML = toRender.map(o => {
        let ringClass = 'ring-gray';
        let action = 'Action performed';

        switch (o.status) {
            case 'DRAFT':
                action = 'Sale Staff created order as draft successfully';
                break;
            case 'AWAITING_APPROVAL':
                action = 'Sale Staff submitted order for approval successfully';
                ringClass = 'ring-yellow';
                break;
            case 'PREPARING':
                action = 'Admin approved and moved order to preparation successfully';
                ringClass = 'ring-blue';
                break;
            case 'QC':
                action = 'Sale Staff completed preparation and moved to QC checking successfully';
                ringClass = 'ring-purple';
                break;
            case 'SHIPPING':
                action = 'Tech Staff passed QC and moved to shipping successfully';
                ringClass = 'ring-orange';
                break;
            case 'AWAITING_INVOICE':
                action = 'Tech Staff shipped order and moved to awaiting invoice successfully';
                ringClass = 'ring-blue';
                break;
            case 'COMPLETED':
                action = 'Accountant Staff created and confirmed invoice successfully';
                ringClass = 'ring-green';
                break;
            case 'REJECTED':
                action = 'Admin rejected the order back to Sales';
                ringClass = 'ring-red';
                break;
        }

        let executorRole = 'Admin';
        switch (o.status) {
            case 'DRAFT':
            case 'AWAITING_APPROVAL':
                executorRole = 'Sale Staff';
                break;
            case 'PREPARING':
            case 'QC':
            case 'SHIPPING':
                executorRole = 'Tech Staff';
                break;
            case 'AWAITING_INVOICE':
                executorRole = 'Accountant Staff';
                break;
            case 'CONFIRMED':
            case 'COMPLETED':
            case 'REJECTED':
                executorRole = 'Admin';
                break;
        }

        let isSystemAction = false;
        // Handle Overdue status for ring
        const isActuallyOverdue = o.is_delivery_delayed || o.is_prepare_delayed || o.is_qc_delayed || o.is_shipping_delayed;
        if (isActuallyOverdue && !['DRAFT', 'REJECTED', 'COMPLETED'].includes(o.status)) {
            ringClass = 'ring-red';
            action = 'Order flagged as overdue by system';
            isSystemAction = true;
        }

        let headerLine = `Order #${o.order_code || o.id}`;

        return `
            <li>
                <div class="timeline-ring ${ringClass}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <strong>${headerLine}</strong>
                        <span>${getTimeAgo(o.updated_at || o.created_at)}</span>
                    </div>
                    <p style="color: #666;">${action}</p>
                </div>
            </li>
        `;
    }).join('');

    const btn = document.getElementById('btnViewLogs');
    if (btn) {
        if (showingAllActivities) {
            // If they are showing all, allow them to toggle back to 5
            btn.innerText = 'Show Less';
            btn.onclick = () => { showingAllActivities = false; renderActivity(); };
        } else {
            btn.innerText = 'View All Logs';
            btn.onclick = () => { showingAllActivities = true; renderActivity(); };
        }
    }
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Chart rendering wrappers (delegate to Recharts renderers defined in HTML)
function renderTrendChartFromStats(trendData) {
    if (window.renderTrendChartRecharts) {
        // Convert backend trend data to format expected by chart
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            days.push(`${y}-${m}-${day}`);
        }

        // Build a lookup from backend data
        const lookup = {};
        trendData.forEach(row => {
            // row.date is now a string 'YYYY-MM-DD' from backend
            const dateStr = row.date;
            lookup[dateStr] = row.count;
        });

        // Create synthetic orders array for existing chart renderer
        const fakeOrders = [];
        days.forEach(dateStr => {
            const count = lookup[dateStr] || 0;
            for (let i = 0; i < count; i++) {
                fakeOrders.push({ created_at: dateStr + 'T00:00:00' });
            }
        });

        window.renderTrendChartRecharts(fakeOrders);
    } else {
        setTimeout(() => renderTrendChartFromStats(trendData), 200);
    }
}

function renderStatusDetailedChart(counts) {
    if (window.renderStatusDetailedChartRecharts) {
        window.renderStatusDetailedChartRecharts(counts);
    } else {
        setTimeout(() => renderStatusDetailedChart(counts), 200);
    }
}

function renderBottleneckChart(bottleneck) {
    if (window.renderBottleneckChartRecharts) {
        window.renderBottleneckChartRecharts(bottleneck);
    } else {
        setTimeout(() => renderBottleneckChart(bottleneck), 200);
    }
}

function renderWorkloadChart(workload) {
    if (window.renderWorkloadChartRecharts) {
        window.renderWorkloadChartRecharts(workload);
    } else {
        setTimeout(() => renderWorkloadChart(workload), 200);
    }
}

function updateSyncTime() {
    const el = document.getElementById('syncTime');
    if (el) {
        el.innerText = `Last synced: ${new Date().toLocaleTimeString()}`;
    }
}

function goToOrderList(filterParam) {
    window.location.href = `../list/O_list.html`;
}
