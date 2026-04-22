// =============================================
// Tech Task JS — Order list filtered for Technical
// Statuses: PREPARING, QC, SHIPPING
// =============================================

function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("awaiting approval")) return "badge-urgent";
    if (s.includes("qc checked") || s === "qc") return "badge-purple";
    if (s.includes("awaiting invoice")) return "badge-lime";
    if (s.includes("rejected")) return "badge-danger";
    if (s.includes("confirmed") || s.includes("completed")) return "badge-success";
    if (s.includes("prepared") || s.includes("prepare") || s === "preparing") return "badge-info";
    if (s.includes("shipping")) return "badge-orange";
    if (s.includes("overdue")) return "badge-danger";
    return "badge-neutral";
}

function goToDetail(id, status) {
    if (!id || id === 'undefined' || id === 'N/A') {
        alert("Invalid ID");
        return;
    }
    sessionStorage.setItem('currentOrderId', id);
    window.location.href = '../detail/detail.html';
}

function formatDate(dateStr) {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
}

const TECH_STATUSES = ['PREPARING', 'QC', 'SHIPPING'];

document.addEventListener('DOMContentLoaded', async function () {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    if (avatar && dropdown) {
        avatar.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', function (e) {
            if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    const tableBody = document.getElementById('orderTableBody');

    const searchInput = document.getElementById('mainSearch');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');

    let allOrders = [];

    // Load orders from API
    try {
        const response = await apiGet('/orders');
        const fetchedOrders = response.data || [];
        // Filter to tech-related statuses only
        allOrders = fetchedOrders.filter(o => TECH_STATUSES.includes(o.status));
    } catch (error) {
        console.error('Failed to load orders:', error);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#999; padding:40px;">Failed to load orders. Please check if the backend is running.</td></tr>`;
        return;
    }

    // Update summary cards
    updateSummaryCards(allOrders);

    // Summary card click to filter
    document.querySelectorAll('.summary-card').forEach(card => {
        card.addEventListener('click', function () {
            const status = this.getAttribute('data-status');
            if (statusFilter) {
                statusFilter.value = status;
                renderOrders();
            }
            // Highlight active card
            document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });

    function updateSummaryCards(orders) {
        const allFetched = orders;
        document.getElementById('countPreparing').textContent = allFetched.filter(o => o.status === 'PREPARING').length;
        document.getElementById('countQc').textContent = allFetched.filter(o => o.status === 'QC').length;
        document.getElementById('countShipping').textContent = allFetched.filter(o => o.status === 'SHIPPING').length;

        // Count overdue
        const overdueCount = allFetched.filter(o =>
            (o.status === 'PREPARING' && o.is_prepare_delayed) ||
            (o.status === 'QC' && o.is_qc_delayed) ||
            (o.status === 'SHIPPING' && o.is_shipping_delayed)
        ).length;
        document.getElementById('countOverdue').textContent = overdueCount;
    }

    function renderOrders() {
        const filterStatus = statusFilter.value;
        const filterPriority = priorityFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        tableBody.innerHTML = '';

        const today = new Date();

        const filteredOrders = allOrders.filter(order => {
            const displayStatus = mapStatus(order.status);

            // Determine Priority
            let orderPriority = 'Low';
            let relevantDeadline = null;
            let isDelayed = false;

            switch (order.status) {
                case 'DRAFT':
                case 'REJECTED':
                case 'COMPLETED':
                    orderPriority = 'None';
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

            if (orderPriority !== 'None') {
                if (isDelayed) {
                    orderPriority = 'High';
                } else if (relevantDeadline) {
                    const deadlineDate = new Date(relevantDeadline);
                    const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) orderPriority = 'High';
                    else if (diffDays <= 3) orderPriority = 'High';
                    else if (diffDays <= 7) orderPriority = 'Medium';
                    else orderPriority = 'Low';
                } else {
                    orderPriority = 'Low';
                }
            }

            order.displayPriority = orderPriority;
            order.displayDeadline = relevantDeadline;

            // Check overdue
            const isOverdue = (order.status === 'PREPARING' && order.is_prepare_delayed) ||
                              (order.status === 'QC' && order.is_qc_delayed) ||
                              (order.status === 'SHIPPING' && order.is_shipping_delayed);

            // Status matching
            let matchesStatus = true;
            if (filterStatus !== 'All') {
                if (filterStatus === 'Overdue') {
                    matchesStatus = isOverdue;
                } else {
                    matchesStatus = displayStatus === filterStatus;
                }
            }

            const matchesPriority = (filterPriority === "All" || orderPriority === filterPriority);

            const orderCode = order.order_code ? String(order.order_code).toLowerCase() : "";
            const customerName = order.customer_name ? String(order.customer_name).toLowerCase() : "";
            const matchesSearch = (orderCode.includes(searchTerm) || customerName.includes(searchTerm));

            return matchesStatus && matchesPriority && matchesSearch;
        });

        // Sort: recently updated float to top
        filteredOrders.sort((a, b) => {
            const tA = new Date(a.updated_at || a.created_at).getTime();
            const tB = new Date(b.updated_at || b.created_at).getTime();
            return tB - tA;
        });

        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#999; padding:40px;">No orders found.</td></tr>`;
            return;
        }

        filteredOrders.forEach(order => {
            // Only check tech-relevant delay flags for Overdue display
            const isActuallyOverdue =
                (order.status === 'PREPARING' && order.is_prepare_delayed) ||
                (order.status === 'QC' && order.is_qc_delayed) ||
                (order.status === 'SHIPPING' && order.is_shipping_delayed);
            
            let displayStatus = mapStatus(order.status);
            if (isActuallyOverdue) {
                displayStatus = 'Overdue';
            }
            const statusClass = getStatusClass(displayStatus);
            const itemCount = `${order.item_count || 0} Items`;
            const priorityClass = order.displayPriority.toLowerCase();

            const row = document.createElement('tr');
            row.setAttribute('data-id', order.id);
            row.innerHTML = `
                <td class="order-id-cell">#${order.order_code || 'N/A'}</td>
                <td>${order.customer_name || 'N/A'}</td>
                <td style="text-align: center;"><span class="badge priority-${priorityClass}">${order.displayPriority}</span></td>
                <td style="text-align: center;"><span class="badge ${statusClass}">${displayStatus}</span></td>
                <td style="text-align: center;">${formatDate(order.displayDeadline)}</td>
                <td style="text-align: center;">${itemCount}</td>
                <td style="text-align: center;">${formatDate(order.created_at)}</td>
                <td style="text-align: center;">
                    <i class="fas fa-external-link-alt" 
                       style="cursor:pointer; color: #2d7a5d; font-size: 16px;" 
                       onclick="goToDetail('${order.id}', '${order.status}')"></i>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Filter events
    [searchInput, statusFilter, priorityFilter].forEach(el => {
        if (el) {
            el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderOrders);
        }
    });

    renderOrders();

    // Avatar / User info
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



