document.addEventListener('DOMContentLoaded', async function () {
    // 1. Auth Guard for Admin
    const authUser = JSON.parse(localStorage.getItem('authUser'));
    if (!authUser || authUser.role !== 'ADMIN') {
        alert('Access denied. Administrator privileges required.');
        window.location.href = '../gate/gate.html';
        return;
    }

    // 2. Map UI - User Info
    const initials = localStorage.getItem('userInitials') || 'AD';
    const fullName = authUser.full_name || localStorage.getItem('currentUser') || 'Admin';
    
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
        card.addEventListener('click', function() {
            const titleEl = this.querySelector('.kpi-title');
            if (!titleEl) return;
            const title = titleEl.innerText;
            if (title === 'DELAYED ORDERS') {
                window.location.href = '../list/O_list.html?filter=Overdue';
            } else if (title === 'TOTAL ORDERS') {
                window.location.href = '../list/O_list.html';
            } else if (title === 'IN PROGRESS') {
                window.location.href = '../list/O_list.html?filter=Processing';
            }
        });
    });

    // 6. Initial load & Auto-refresh
    await loadDashboardData();
    const refreshInterval = setInterval(loadDashboardData, 30000);
    window.addEventListener('unload', () => clearInterval(refreshInterval));
});






let statusChartInstance = null;

// Colors mapping matching the requirements
const STATUS_COLORS = {
    'confirmed': '#2e7d32',        // Green
    'awaiting approval': '#f9a825',// Yellow
    'prepared': '#1976d2',         // Blue
    'qc checked': '#7b1fa2',       // Purple
    'shipping': '#ef6c00',         // Orange
    'awaiting invoice': '#cddc39', // Lime
    'overdue': '#d32f2f',          // Bright Red
    'rejected': '#c62828',         // Dark Red
    'completed': '#1b5e20'         // Dark Green
};

const PRIORITY_COLORS = {
    'high': '#d32f2f',    // Red
    'medium': '#ffb300',  // Amber
    'low': '#4caf50',     // Green
    'none': '#9e9e9e'     // Grey
};

const DEPT_COLORS = {
    'technical': '#7b1fa2', // Purple
    'sales': '#ef6c00',     // Orange
    'accountant': '#1976d2' // Blue
};



async function loadDashboardData() {
    updateSyncTime();

    try {
        const response = await apiGet('/orders');
        // Handle both formats: direct array or {data: []}
        const fetchedOrders = response.data || response;
        
        if (!fetchedOrders || fetchedOrders.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('dashboardContent').style.display = 'none';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';

        processDashboardMetrics(fetchedOrders);
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function processDashboardMetrics(orders) {
    const today = new Date();
    const statusCounts = {
        'Awaiting Approval': 0,
        'Confirmed': 0,
        'Prepared': 0,
        'QC Checked': 0,
        'Shipping': 0,
        'Awaiting Invoice': 0,
        'Completed': 0,
        'Rejected': 0,
        'Overdue': 0,
        'Other': 0
    };

    const priorityCounts = { 'High': 0, 'Medium': 0, 'Low': 0, 'None': 0 };
    const deptCounts = { 'Sales': 0, 'Technical': 0, 'Accountant': 0 };

    orders.forEach(order => {
        const rawStatus = order.status;
        let displayStatus = 'Other';

        // --- 1. Map Status to Display Text ---
        if (rawStatus === 'AWAITING_APPROVAL') displayStatus = 'Awaiting Approval';
        else if (rawStatus === 'CONFIRMED') displayStatus = 'Confirmed';
        else if (rawStatus === 'PREPARING') displayStatus = 'Prepared';
        else if (rawStatus === 'QC') displayStatus = 'QC Checked';
        else if (rawStatus === 'SHIPPING') displayStatus = 'Shipping';
        else if (rawStatus === 'AWAITING_INVOICE') displayStatus = 'Awaiting Invoice';
        else if (rawStatus === 'COMPLETED') displayStatus = 'Completed';
        else if (rawStatus === 'REJECTED') displayStatus = 'Rejected';

        // Check for Overdue (derived from flags or dates)
        const isActuallyOverdue = order.is_delivery_delayed || order.is_prepare_delayed || 
                                order.is_qc_delayed || order.is_shipping_delayed;
        
        if (isActuallyOverdue && rawStatus !== 'DRAFT' && rawStatus !== 'REJECTED' && rawStatus !== 'COMPLETED') {
            displayStatus = 'Overdue';
        }

        if (statusCounts[displayStatus] !== undefined) {
            statusCounts[displayStatus]++;
        } else {
            statusCounts['Other']++;
        }

        // --- 2. Map Priority based on current task deadline ---
        let priority = 'Low';
        let relevantDeadline = null;
        let isDelayed = false;

        switch (rawStatus) {
            case 'DRAFT':
            case 'REJECTED':
            case 'COMPLETED':
                priority = 'None';
                break;
            case 'AWAITING_APPROVAL':
                relevantDeadline = order.expected_delivery_date;
                isDelayed = order.is_delivery_delayed;
                break;
            case 'CONFIRMED':
            case 'PREPARING':
                relevantDeadline = order.prepare_deadline;
                isDelayed = order.is_prepare_delayed;
                break;
            case 'QC':
                relevantDeadline = order.qc_deadline;
                isDelayed = order.is_qc_delayed;
                break;
            case 'SHIPPING':
                relevantDeadline = order.shipping_deadline;
                isDelayed = order.is_shipping_delayed;
                break;
            case 'AWAITING_INVOICE':
                relevantDeadline = order.expected_delivery_date;
                isDelayed = order.is_delivery_delayed;
                break;
            default:
                relevantDeadline = order.expected_delivery_date;
                isDelayed = order.is_delivery_delayed;
        }

        if (priority !== 'None') {
            if (isDelayed) {
                priority = 'High';
            } else if (relevantDeadline) {
                const deadlineDate = new Date(relevantDeadline);
                const diffTime = deadlineDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) priority = 'High';
                else if (diffDays <= 3) priority = 'High';
                else if (diffDays <= 7) priority = 'Medium';
                else priority = 'Low';
            } else {
                priority = 'Low';
            }
        }
        
        if (priorityCounts[priority] !== undefined) {
            priorityCounts[priority]++;
        } else {
            priorityCounts['None']++;
        }

        // --- 3. Map Department (Derived from Status) ---
        let dept = 'Sales';
        if (['Awaiting Approval', 'Confirmed', 'Rejected'].includes(displayStatus)) {
            dept = 'Sales';
        } else if (['Prepared', 'QC Checked', 'Shipping', 'Overdue'].includes(displayStatus)) {
            dept = 'Technical';
        } else if (['Awaiting Invoice'].includes(displayStatus)) {
            dept = 'Accountant';
        }
        deptCounts[dept]++;
    });

    const inProgress = Object.keys(statusCounts).reduce((acc, key) => {
        if (['Prepared', 'QC Checked', 'Shipping', 'Confirmed'].includes(key)) {
            return acc + statusCounts[key];
        }
        return acc;
    }, 0);

    const delayed = statusCounts['Overdue'] || 0;
    
    // Mock QC Fail if we don't have rejection reasons
    const qcFail = statusCounts['Rejected'] || 0;
    const failRate = orders.length > 0 ? ((qcFail / orders.length) * 100).toFixed(1) : "0.0";

    document.getElementById('totalOrders').innerText = orders.length.toLocaleString();
    document.getElementById('kpiInProgress').innerText = inProgress.toLocaleString();
    document.getElementById('kpiDelayed').innerText = delayed.toLocaleString();
    document.getElementById('kpiQCFail').innerText = failRate + '%';

    renderStatusDetailedChart(statusCounts);
    renderTrendChart(orders);
    renderAlerts(orders);
    renderActivity(orders);
}

function renderAlerts(orders) {
    const container = document.getElementById('alertsContainer');
    const badge = document.getElementById('liveIssuesBadge');
    if (!container) return;

    // Filter orders with any delay
    const delayedOrders = orders.filter(o => 
        (o.is_delivery_delayed || o.is_qc_delayed || o.is_prepare_delayed || o.is_shipping_delayed) &&
        o.status !== 'COMPLETED' && o.status !== 'REJECTED'
    ).sort((a, b) => b.id - a.id);
    
    badge.innerText = `${delayedOrders.length} LIVE ISSUES`;

    if (delayedOrders.length === 0) {
        container.innerHTML = `
            <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; text-align: center; border: 1px dashed #ddd;">
                <i class="fas fa-check-circle" style="color: #52c41a; font-size: 24px; margin-bottom: 10px;"></i>
                <p style="color: #666; font-size: 13px; margin: 0;">Excellent! No critical delays detected.</p>
            </div>`;
        return;
    }

    // Show top 3 most recent delays
    const topDelays = delayedOrders.slice(0, 3);
    container.innerHTML = topDelays.map(o => {
        let type = 'Processing delay';
        let icon = 'fa-clock';
        let level = 'warning-box';
        
        if (o.is_qc_delayed) { type = 'QC Bottleneck'; icon = 'fa-microscope'; level = 'danger-box'; }
        else if (o.is_shipping_delayed) { type = 'Logistics delay'; icon = 'fa-truck-loading'; }
        else if (o.is_delivery_delayed) { type = 'Delivery Overdue'; icon = 'fa-calendar-times'; level = 'danger-box'; }
        
        return `
            <div class="alert-box ${level}">
                <div class="alert-box-icon"><i class="fas ${icon}"></i></div>
                <div class="alert-box-content">
                    <div class="alert-box-header">
                        <strong>${type} - #${o.order_code || o.id}</strong>
                        <span>${getTimeAgo(o.updated_at)}</span>
                    </div>
                    <p>${o.customer_name || 'Customer'} - ${o.order_title || 'Untitled Order'}</p>
                    <div class="alert-box-actions">
                        <button class="btn-warning-solid" style="padding: 4px 10px; font-size: 11px;" onclick="window.location.href='../detail/detail.html?id=${o.id}'">View Detail</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderActivity(orders) {
    const container = document.getElementById('activityHistory');
    if (!container) return;

    // Sort by recent update/creation
    const recent = [...orders].sort((a,b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
    }).slice(0, 5);
    
    container.innerHTML = recent.map(o => {
        let ringClass = 'ring-gray';
        let action = 'State changed to';
        
        if (['SHIPPING', 'AWAITING_INVOICE', 'COMPLETED'].includes(o.status)) {
            ringClass = 'ring-blue';
            action = 'Progressed to';
        } else if (o.status === 'REJECTED') {
            ringClass = 'ring-red';
            action = 'Order was';
        } else if (o.status === 'CONFIRMED') {
            ringClass = 'ring-blue';
            action = 'Admin approved';
        }

        return `
            <li>
                <div class="timeline-ring ${ringClass}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <strong>${action} ${mapStatus(o.status)}</strong>
                        <span>${getTimeAgo(o.updated_at || o.created_at)}</span>
                    </div>
                    <p>Order #${o.order_code || o.id} - ${o.customer_name || 'Client'}</p>
                </div>
            </li>
        `;
    }).join('');
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

function renderTrendChart(orders) {
    if (window.renderTrendChartRecharts) {
        window.renderTrendChartRecharts(orders);
    } else {
        setTimeout(() => renderTrendChart(orders), 200);
    }
}

function renderStatusDetailedChart(counts) {
    if (window.renderStatusDetailedChartRecharts) {
        window.renderStatusDetailedChartRecharts(counts);
    } else {
        setTimeout(() => renderStatusDetailedChart(counts), 200);
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
