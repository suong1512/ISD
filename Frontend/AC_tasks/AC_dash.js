// =============================================
// Accountant Task JS — Order list filtered for Accountants
// Statuses: AWAITING_INVOICE, COMPLETED, OVERDUE
// =============================================

function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("awaiting invoice")) return "badge-lime";
    if (s.includes("completed")) return "badge-success";
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

const ACCOUNTANT_STATUSES = ['AWAITING_INVOICE', 'COMPLETED'];

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
        // Filter to accountant-related statuses or overdue
        allOrders = fetchedOrders.filter(o => 
            ACCOUNTANT_STATUSES.includes(o.status) || 
            o.is_prepare_delayed || o.is_qc_delayed || o.is_shipping_delayed || o.is_delivery_delayed
        );
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
        document.getElementById('countAwaitingInvoice').textContent = orders.filter(o => o.status === 'AWAITING_INVOICE').length;
        document.getElementById('countCompleted').textContent = orders.filter(o => o.status === 'COMPLETED').length;

        // Count overdue: orders that have any delay flag set (only for relevant accountant tasks or all?)
        // User asked for Overdue status as one of the filters.
        const overdueCount = orders.filter(o =>
            o.is_prepare_delayed || o.is_qc_delayed || o.is_shipping_delayed || o.is_delivery_delayed
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
            const isOverdue = order.is_prepare_delayed || order.is_qc_delayed ||
                order.is_shipping_delayed || order.is_delivery_delayed;

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

        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#999; padding:40px;">No orders found.</td></tr>`;
            return;
        }

        filteredOrders.forEach(order => {
            const isActuallyOverdue = order.is_prepare_delayed || order.is_qc_delayed ||
                        order.is_shipping_delayed || order.is_delivery_delayed;
            const displayStatus = (isActuallyOverdue && order.status !== 'COMPLETED' && order.status !== 'REJECTED' && order.status !== 'DRAFT') ? 'Overdue' : mapStatus(order.status);
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
                <td style="text-align: center;">${formatDate(order.expected_delivery_date)}</td>
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

    if (searchInput) searchInput.addEventListener('input', renderOrders);
    if (statusFilter) statusFilter.addEventListener('change', renderOrders);
    if (priorityFilter) priorityFilter.addEventListener('change', renderOrders);

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



