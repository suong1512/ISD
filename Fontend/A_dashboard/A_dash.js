document.addEventListener('DOMContentLoaded', async function () {
    // 1. Auth Guard for Admin
    const authUser = JSON.parse(localStorage.getItem('authUser'));
    if (!authUser || authUser.role !== 'ADMIN') {
        alert('Access denied. Administrator privileges required.');
        window.location.href = '../A_login/A_login.html';
        return;
    }

    // Map UI
    document.getElementById('dropdownName').innerText = authUser.full_name;
    document.getElementById('avatarTrigger').innerText = localStorage.getItem('userInitials') || 'AD';

    // Dropdown toggle
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);

    // Initial load
    await loadDashboardData();


    // Avatar
    const initials = localStorage.getItem('userInitials');
    const fullName = localStorage.getItem('currentUser');
    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.querySelector('.dropdown-header strong');

    if (initials && avatarElement) {
        avatarElement.innerText = initials;
    }
    if (fullName && dropdownName) {
        dropdownName.innerText = fullName;
    }
});


// Dropdown Avatar
document.addEventListener('DOMContentLoaded', function () {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    avatar.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
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
    'low': '#4caf50'      // Green
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
        const allOrders = Array.isArray(response) ? response : (response.data || []);

        // Exclude Drafts
        const validOrders = allOrders.filter(o => (o.status || '').toUpperCase() !== 'DRAFT');

        if (validOrders.length === 0) {
            document.getElementById('dashboardContent').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';

        processDashboardMetrics(validOrders);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        alert('Failed to load dashboard data. Please try again.');
    }
}

function processDashboardMetrics(orders) {
    document.getElementById('totalOrders').innerText = orders.length;

    // Initialize counts
    const statusCounts = {
        'Confirmed': 0,
        'Awaiting Approval': 0,
        'Prepared': 0,
        'QC Checked': 0,
        'Shipping': 0,
        'Awaiting Invoice': 0,
        'Completed': 0,
        'Overdue': 0,
        'Rejected': 0,
        'Other': 0
    };

    const priorityCounts = { 'High': 0, 'Medium': 0, 'Low': 0 };
    const deptCounts = { 'Sales': 0, 'Technical': 0, 'Accountant': 0 };

    const today = new Date();

    orders.forEach(order => {
        // --- 1. Map Status ---
        let rawStatus = (order.status || '').toUpperCase();
        let displayStatus = 'Other';

        if (rawStatus === 'AWAITING_APPROVAL') displayStatus = 'Awaiting Approval';
        else if (rawStatus === 'CONFIRMED') displayStatus = 'Confirmed';
        else if (rawStatus === 'PREPARING') displayStatus = 'Prepared';
        else if (rawStatus === 'QC') displayStatus = 'QC Checked';
        else if (rawStatus === 'SHIPPING') displayStatus = 'Shipping';
        else if (rawStatus === 'AWAITING_INVOICE') displayStatus = 'Awaiting Invoice';
        else if (rawStatus === 'COMPLETED') displayStatus = 'Completed';
        else if (rawStatus === 'REJECTED') displayStatus = 'Rejected';

        // Check for Overdue (derived from flags or dates)
        if (order.is_delivery_delayed || order.is_prepare_delayed || order.is_qc_delayed || order.is_shipping_delayed) {
            displayStatus = 'Overdue';
        }

        if (statusCounts[displayStatus] !== undefined) {
            statusCounts[displayStatus]++;
        } else {
            statusCounts['Other']++;
        }

        // --- 2. Map Priority (Derived from Expected Delivery Date) ---
        let priority = 'Low';
        if (order.expected_delivery_date) {
            const deliveryDate = new Date(order.expected_delivery_date);
            const diffTime = deliveryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0 || order.is_delivery_delayed) {
                priority = 'High'; // Overdue
            } else if (diffDays <= 3) {
                priority = 'High';
            } else if (diffDays <= 7) {
                priority = 'Medium';
            }
        }
        priorityCounts[priority]++;

        // --- 3. Map Department (Derived from Status) ---
        let dept = 'Sales';
        if (displayStatus === 'Awaiting Approval' || displayStatus === 'Confirmed' || displayStatus === 'Rejected') {
            dept = 'Sales';
        } else if (displayStatus === 'Prepared' || displayStatus === 'QC Checked' || displayStatus === 'Shipping' || displayStatus === 'Overdue') {
            dept = 'Technical';
        } else if (displayStatus === 'Awaiting Invoice') {
            dept = 'Accountant';
        }
        deptCounts[dept]++;
    });

    const inProgress = Object.keys(statusCounts).reduce((acc, key) => {
        if (['Prepared', 'QC Checked', 'Shipping'].includes(key)) {
            return acc + statusCounts[key];
        }
        return acc;
    }, 0);

    const delayed = statusCounts['Overdue'] || 0;
    
    // Mock QC Fail if we don't have rejection reasons
    const qcFail = statusCounts['Rejected'] || 0;
    const failRate = orders.length > 0 ? ((qcFail / orders.length) * 100).toFixed(2) : "0.00";

    document.getElementById('totalOrders').innerText = orders.length.toLocaleString();
    document.getElementById('kpiInProgress').innerText = inProgress.toLocaleString();
    document.getElementById('kpiDelayed').innerText = delayed.toLocaleString();
    document.getElementById('kpiQCFail').innerText = failRate + '%';

    renderChart(statusCounts, orders.length);
    renderBottleneckChart(orders);
    renderAlerts(orders);
    renderActivity(orders);
}

function renderAlerts(orders) {
    const container = document.getElementById('alertsContainer');
    const badge = document.getElementById('liveIssuesBadge');
    if (!container) return;

    // Filter orders with any delay
    const delayedOrders = orders.filter(o => o.is_delivery_delayed || o.is_qc_delayed || o.is_prepare_delayed || o.is_shipping_delayed);
    badge.innerText = `${delayedOrders.length} LIVE ISSUES`;

    if (delayedOrders.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 13px;">No critical delays detected at this time.</p>';
        return;
    }

    // Show top 2 most recent delays
    const topDelays = delayedOrders.slice(0, 2);
    container.innerHTML = topDelays.map(o => {
        const type = o.is_qc_delayed ? 'QC Overload' : (o.is_shipping_delayed ? 'Shipping Delay' : 'Processing Delay');
        const boxClass = o.is_qc_delayed ? 'danger-box' : 'warning-box';
        const icon = o.is_qc_delayed ? 'fa-bolt' : 'fa-arrow-down';
        
        return `
            <div class="alert-box ${boxClass}">
                <div class="alert-box-icon"><i class="fas ${icon}"></i></div>
                <div class="alert-box-content">
                    <div class="alert-box-header">
                        <strong>${type} - Order #${o.order_code}</strong>
                        <span>Just now</span>
                    </div>
                    <p>${o.customer_name || 'Customer'} is waiting for this order. Status: ${mapStatus(o.status)}.</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderActivity(orders) {
    const container = document.getElementById('activityHistory');
    if (!container) return;

    // Get 4 most recent orders
    const recent = [...orders].sort((a,b) => b.id - a.id).slice(0, 4);
    
    container.innerHTML = recent.map(o => {
        let ringClass = 'ring-gray';
        if (o.status === 'SHIPPING' || o.status === 'COMPLETED') ringClass = 'ring-blue';
        if (o.status === 'REJECTED') ringClass = 'ring-red';

        return `
            <li>
                <div class="timeline-ring ${ringClass}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <strong>Order #${o.order_code} ${mapStatus(o.status)}</strong>
                        <span>${new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p>${o.customer_name || 'Anonymous'} - ${o.order_title || 'No Title'}</p>
                </div>
            </li>
        `;
    }).join('');
}

function renderChart(counts, total) {
    // Retry polling until babel parses the JSX
    if (window.renderStatusChartRecharts) {
        window.renderStatusChartRecharts(counts, total);
    } else {
        setTimeout(() => renderChart(counts, total), 100);
    }
}

function renderBottleneckChart(orders) {
    if (window.renderBottleneckChartRecharts) {
        window.renderBottleneckChartRecharts(orders);
    } else {
        setTimeout(() => renderBottleneckChart(orders), 100);
    }
}

function updateSyncTime() {
    // No element in HTML for this yet, skipping to avoid errors
}

function goToOrderList(filterParam) {
    window.location.href = `../List/A_list.html`;
}
