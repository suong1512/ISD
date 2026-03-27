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
});

let statusChartInstance = null;

// Colors mapping matching the requirements
const STATUS_COLORS = {
    'confirmed': '#2e7d32',        // Green
    'awaiting approval': '#f9a825',// Yellow
    'preparing': '#1976d2',        // Blue
    'qc check': '#7b1fa2',         // Purple
    'shipping': '#ef6c00',         // Orange
    'awaiting invoice': '#cddc39', // Lime
    'delayed': '#d32f2f',          // Bright Red
    'rejected': '#c62828'          // Dark Red
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
        const allOrders = response.data || [];

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
        'Preparing': 0,
        'QC Check': 0,
        'Shipping': 0,
        'Awaiting Invoice': 0,
        'Delayed': 0,
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

        if (rawStatus === 'PENDING_APPROVAL') displayStatus = 'Awaiting Approval';
        else if (rawStatus === 'CONFIRMED') displayStatus = 'Confirmed';
        else if (rawStatus === 'PREPARING') displayStatus = 'Preparing';
        else if (rawStatus === 'QC') displayStatus = 'QC Check';
        else if (rawStatus === 'SHIPPING') displayStatus = 'Shipping';
        else if (rawStatus === 'REJECTED') displayStatus = 'Rejected';
        
        // Check for Delayed (derived from flags or dates)
        if (order.is_delivery_delayed || order.is_prepare_delayed || order.is_qc_delayed || order.is_shipping_delayed) {
            displayStatus = 'Delayed';
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
        } else if (displayStatus === 'Preparing' || displayStatus === 'QC Check' || displayStatus === 'Shipping' || displayStatus === 'Delayed') {
            dept = 'Technical';
        } else if (displayStatus === 'Awaiting Invoice') {
            dept = 'Accountant';
        }
        deptCounts[dept]++;
    });

    renderStatusGrid(statusCounts);
    renderPriorityGrid(priorityCounts);
    renderDepartmentGrid(deptCounts);
    renderChart(statusCounts, orders.length);
}

function renderStatusGrid(counts) {
    const grid = document.getElementById('statusGrid');
    grid.innerHTML = '';

    const keys = ['Awaiting Approval', 'Confirmed', 'Preparing', 'QC Check', 'Shipping', 'Delayed', 'Rejected'];
    
    keys.forEach(key => {
        const val = counts[key];
        const colorClass = getColorClassForStatus(key);
        
        const el = document.createElement('div');
        el.className = `stat-item ${colorClass}`;
        el.onclick = () => goToOrderList(`status=${encodeURIComponent(key)}`);
        el.innerHTML = `
            <span class="stat-label">${key}</span>
            <span class="stat-value">${val}</span>
        `;
        grid.appendChild(el);
    });
}

function renderPriorityGrid(counts) {
    const grid = document.getElementById('priorityGrid');
    grid.innerHTML = '';
    
    ['High', 'Medium', 'Low'].forEach(key => {
        const val = counts[key];
        const colorStyle = `border-left-color: ${PRIORITY_COLORS[key.toLowerCase()]};`;
        
        const el = document.createElement('div');
        el.className = 'stat-item';
        el.style = colorStyle;
        el.onclick = () => goToOrderList(`priority=${encodeURIComponent(key)}`);
        el.innerHTML = `
            <span class="stat-label">${key}</span>
            <span class="stat-value">${val}</span>
        `;
        grid.appendChild(el);
    });
}

function renderDepartmentGrid(counts) {
    const grid = document.getElementById('departmentGrid');
    grid.innerHTML = '';
    
    ['Sales', 'Technical', 'Accountant'].forEach(key => {
        const val = counts[key];
        const colorStyle = `border-left-color: ${DEPT_COLORS[key.toLowerCase()]};`;
        
        const el = document.createElement('div');
        el.className = 'stat-item';
        el.style = colorStyle;
        el.onclick = () => goToOrderList(`dept=${encodeURIComponent(key)}`);
        el.innerHTML = `
            <span class="stat-label">${key}</span>
            <span class="stat-value">${val}</span>
        `;
        grid.appendChild(el);
    });
}

function renderChart(counts, total) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    const labels = [];
    const data = [];
    const bgColors = [];

    Object.keys(counts).forEach(key => {
        if (counts[key] > 0 && key !== 'Other') {
            labels.push(key);
            data.push(counts[key]);
            bgColors.push(STATUS_COLORS[key.toLowerCase()] || '#999');
        }
    });

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function getColorClassForStatus(status) {
    const map = {
        'Awaiting Approval': 'border-yellow',
        'Confirmed': 'border-green',
        'Preparing': 'border-blue',
        'QC Check': 'border-purple',
        'Shipping': 'border-orange',
        'Awaiting Invoice': 'border-lime',
        'Delayed': 'border-brightred',
        'Rejected': 'border-darkred'
    };
    return map[status] || 'border-blue';
}

function updateSyncTime() {
    const now = new Date();
    document.getElementById('lastSyncTime').innerText = now.toLocaleTimeString();
}

function goToOrderList(filterParam) {
    window.location.href = `../A_confirm/A_confirm.html`;
}
