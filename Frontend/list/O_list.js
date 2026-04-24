// 1. Hàm bổ trợ lấy Class CSS cho Badge
function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("awaiting approval")) return "badge-urgent";
    if (s.includes("qc checked")) return "badge-purple";
    if (s.includes("awaiting invoice")) return "badge-lime";
    if (s.includes("rejected")) return "badge-danger";
    if (s.includes("confirmed") || s.includes("completed")) return "badge-success";
    if (s.includes("prepared") || s.includes("prepare")) return "badge-info";
    if (s.includes("shipping")) return "badge-orange";
    if (s.includes("overdue")) return "badge-danger";
    return "badge-neutral";
}

// 2. Hàm điều hướng
function goToDetail(id, status) {
    if (!id || id === 'undefined' || id === 'N/A') {
        alert("Invalid ID");
        return;
    }

    if (status === 'DRAFT') {
        window.location.href = `../S_create_order/index.html?edit=${id}`;
    } else {
        sessionStorage.setItem('currentOrderId', id);
        window.location.href = '../detail/detail.html';
    }
}

// Format date from ISO to readable
function formatDate(dateStr) {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 3. Khởi tạo khi trang tải xong
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
    const deptFilter = document.getElementById('deptFilter');

    let allOrders = [];

    // Apply initial filters from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');

    if (filterParam) {
        if (filterParam.startsWith('status=')) {
            const statusVal = decodeURIComponent(filterParam.split('=')[1]);
            const options = Array.from(statusFilter.options).map(o => o.value);
            if (options.includes(statusVal)) {
                statusFilter.value = statusVal;
            }
        } else if (filterParam.startsWith('priority=')) {
            const priorityVal = decodeURIComponent(filterParam.split('=')[1]);
            const options = Array.from(priorityFilter.options).map(o => o.value);
            if (options.includes(priorityVal)) {
                priorityFilter.value = priorityVal;
            }
        } else if (filterParam.startsWith('dept=')) {
            let deptVal = decodeURIComponent(filterParam.split('=')[1]);
            // A_dash.js might pass Tech/Account/Sales
            if (deptVal === 'Technical') deptVal = 'Tech';
            if (deptVal === 'Accountant') deptVal = 'Account';
            const options = Array.from(deptFilter.options).map(o => o.value);
            if (options.includes(deptVal)) {
                deptFilter.value = deptVal;
            }
        } else if (filterParam === 'Active') {
            if (statusFilter) statusFilter.value = 'Active';
        } else if (filterParam === 'Overdue') {
            if (statusFilter) statusFilter.value = 'Overdue';
        }
    }

    // Load orders từ API
    try {
        const response = await apiGet('/orders');
        let fetchedOrders = response.data || [];

        const authUser = JSON.parse(localStorage.getItem('authUser')) || {};
        if (authUser.role === 'ADMIN') {
            fetchedOrders = fetchedOrders.filter(o => o.status !== 'DRAFT');
        }

        allOrders = fetchedOrders;
    } catch (error) {
        console.error('Failed to load orders:', error);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#999; padding:40px;">Failed to load orders. Please check if the backend is running.</td></tr>`;
        return;
    }

    function renderOrders() {
        const filterStatus = statusFilter.value;
        const filterPriority = priorityFilter.value;
        const filterDept = deptFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        // Xóa toàn bộ rồi render lại
        tableBody.innerHTML = '';

        const today = new Date();

        const filteredOrders = allOrders.filter(order => {
            const displayStatus = mapStatus(order.status);

            // --- Determine Priority based on current task deadline ---
            let orderPriority = 'Low';
            let relevantDeadline = null;
            let isDelayed = false;

            // Mapping Task-specific deadlines based on current status
            switch (order.status) {
                case 'DRAFT':
                case 'REJECTED':
                case 'COMPLETED':
                    orderPriority = 'None';
                    break;
                case 'AWAITING_APPROVAL':
                    if (order.prepare_deadline) {
                        const d = new Date(order.prepare_deadline);
                        d.setDate(d.getDate() + 1);
                        relevantDeadline = d.toISOString().split('T')[0];
                        // Recalculate delay based on this new deadline
                        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        isDelayed = dOnly < tOnly;
                    } else {
                        relevantDeadline = order.expected_delivery_date;
                        isDelayed = order.is_delivery_delayed;
                    }
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
                // Backend already flagged this task as overdue
                orderPriority = 'High';
            } else if (relevantDeadline) {
                const deadlineDate = new Date(relevantDeadline);
                const diffTime = deadlineDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    orderPriority = 'High';
                } else if (diffDays <= 3) {
                    orderPriority = 'High';
                } else if (diffDays <= 7) {
                    orderPriority = 'Medium';
                } else {
                    orderPriority = 'Low';
                }
            }
            }

            // --- Determine Department ---
            let orderDept = 'Sales';
            if (displayStatus === 'Completed' || displayStatus === 'Rejected') {
                orderDept = 'None';
            } else if (displayStatus === 'Awaiting Approval' || displayStatus === 'Confirmed') {
                orderDept = 'Sales';
            } else if (displayStatus === 'Prepared' || displayStatus === 'QC Checked' || displayStatus === 'Shipping' || displayStatus === 'Overdue') {
                orderDept = 'Tech';
            } else if (displayStatus === 'Awaiting Invoice') {
                orderDept = 'Account';
            }
            order.displayPriority = orderPriority;
            order.displayDept = orderDept;
            order.displayDeadline = relevantDeadline;

            // Check Overdue status
            const isOverdue = (order.is_prepare_delayed || order.is_qc_delayed ||
                order.is_shipping_delayed || order.is_delivery_delayed) &&
                order.status !== 'DRAFT' && order.status !== 'REJECTED' && order.status !== 'COMPLETED';

            // Lọc dữ liệu
            let matchesStatus = true;
            if (filterStatus !== 'All') {
                if (filterStatus === 'Overdue') {
                    matchesStatus = isOverdue;
                } else if (filterStatus === 'Active') {
                    matchesStatus = (order.status !== 'DRAFT' && order.status !== 'COMPLETED' && order.status !== 'REJECTED');
                } else {
                    matchesStatus = displayStatus === filterStatus;
                }
            }
            const matchesPriority = (filterPriority === "All" || orderPriority === filterPriority);
            const matchesDept = (filterDept === "All" || orderDept === filterDept);

            const orderCode = order.order_code ? String(order.order_code).toLowerCase() : "";
            const customerName = order.customer_name ? String(order.customer_name).toLowerCase() : "";
            const matchesSearch = (orderCode.includes(searchTerm) || customerName.includes(searchTerm));

            return matchesStatus && matchesPriority && matchesDept && matchesSearch;
        });

        // Sort: active orders first (newest updated), COMPLETED in middle, REJECTED at very bottom
        filteredOrders.sort((a, b) => {
            const tier = s => s === 'REJECTED' ? 2 : s === 'COMPLETED' ? 1 : 0;
            const diff = tier(a.status) - tier(b.status);
            if (diff !== 0) return diff;
            const tA = new Date(a.updated_at || a.created_at).getTime();
            const tB = new Date(b.updated_at || b.created_at).getTime();
            return tB - tA;
        });

        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#999; padding:40px;">No orders found.</td></tr>`;
            return;
        }

        filteredOrders.forEach(order => {
            const isOverdue = order.is_prepare_delayed || order.is_qc_delayed ||
                             order.is_shipping_delayed || order.is_delivery_delayed;
            
            let displayStatus = mapStatus(order.status);
            if (isOverdue && order.status !== 'DRAFT' && order.status !== 'REJECTED' && order.status !== 'COMPLETED') {
                displayStatus = 'Overdue';
            }
            const statusClass = getStatusClass(displayStatus);
            const itemCount = `${order.item_count || 0} Items`;

            // Setup Badge priorities and dept
            const priorityClass = order.displayPriority.toLowerCase();
            const deptClass = 'dept-' + order.displayDept.toLowerCase().replace('/', '');

            const row = document.createElement('tr');
            row.setAttribute('data-id', order.id);
            row.innerHTML = `
                <td class="order-id-cell">#${order.order_code || 'N/A'}</td>
                <td>${order.customer_name || 'N/A'}</td>
                <td style="text-align: center;"><span class="badge ${deptClass}">${order.displayDept}</span></td>
                <td style="text-align: center;"><span class="badge priority-${priorityClass}">${order.displayPriority}</span></td>
                <td style="text-align: center;"><span class="badge ${statusClass}">${displayStatus}</span></td>
                <td style="text-align: center;">${formatDate(order.displayDeadline || order.shipping_deadline)}</td>
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

    // Gán sự kiện lọc
    [searchInput, statusFilter, priorityFilter, deptFilter].forEach(el => {
        if (el) {
            el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderOrders);
        }
    });

    renderOrders(); // Chạy lần đầu

    // Avatar / User info
    const initials = localStorage.getItem('userInitials');
    const fullName = localStorage.getItem('currentUser');
    const authUser = JSON.parse(localStorage.getItem('authUser')) || {};

    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.querySelector('.dropdown-header strong');

    if (initials && avatarElement) {
        avatarElement.innerText = initials;
    }
    if (fullName && dropdownName) {
        dropdownName.innerText = fullName;
    }
});



