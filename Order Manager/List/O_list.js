// 1. Hàm bổ trợ lấy Class CSS cho Badge
function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("awaiting approval")) return "badge-awaiting";
    if (s.includes("qc checked")) return "badge-qc";
    if (s.includes("awaiting invoice")) return "badge-invoice";
    if (s.includes("rejected")) return "badge-rejected";
    if (s.includes("confirmed")) return "badge-confirmed";
    if (s.includes("prepared") || s.includes("prepare")) return "badge-prepared";
    if (s.includes("shipping")) return "badge-shipping";
    if (s.includes("completed") || s.includes("delivered")) return "badge-completed";
    return "badge-draft"; 
}

// 2. Hàm điều hướng
function goToDetail(id, status) {
    if(!id || id === 'undefined' || id === 'N/A') {
        alert("Invalid ID");
        return;
    }

    if (status === 'DRAFT') {
        window.location.href = `../Create/index.html?edit=${id}`;
    } else {
        sessionStorage.setItem('currentOrderId', id);
        window.location.href = '../Detail/detail.html';
    }
}

// Format date from ISO to readable
function formatDate(dateStr) {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
}

// 3. Khởi tạo khi trang tải xong
document.addEventListener('DOMContentLoaded', async function () {
    const tableBody = document.getElementById('orderTableBody');
    const searchInput = document.getElementById('mainSearch');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const deptFilter = document.getElementById('deptFilter');

    let allOrders = [];

    // Load orders từ API
    try {
        const response = await apiGet('/orders');
        allOrders = response.data || [];
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

        const filteredOrders = allOrders.filter(order => {
            const displayStatus = mapStatus(order.status);
            
            // Lọc dữ liệu
            const matchesStatus = (filterStatus === "All" || displayStatus === filterStatus);
            const matchesPriority = (filterPriority === "All"); // Backend chưa có priority
            const matchesDept = (filterDept === "All"); // Backend chưa có dept
            
            const orderCode = order.order_code ? String(order.order_code).toLowerCase() : "";
            const customerName = order.customer_name ? String(order.customer_name).toLowerCase() : "";
            const matchesSearch = (orderCode.includes(searchTerm) || customerName.includes(searchTerm));

            return matchesStatus && matchesPriority && matchesDept && matchesSearch;
        });

        if (filteredOrders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#999; padding:40px;">No orders found.</td></tr>`;
            return;
        }

        filteredOrders.forEach(order => {
            const displayStatus = mapStatus(order.status);
            const statusClass = getStatusClass(displayStatus);
            const itemCount = `${order.item_count || 0} Items`;

            const row = document.createElement('tr');
            row.setAttribute('data-id', order.id);
            row.innerHTML = `
                <td class="order-id-cell">#${order.order_code || 'N/A'}</td>
                <td>${order.customer_name || 'N/A'}</td>
                <td><span class="badge dept-sales">Sales</span></td>
                <td><span class="badge priority-medium">Medium</span></td>
                <td><span class="badge ${statusClass}">${displayStatus}</span></td>
                <td>${formatDate(order.shipping_deadline)}</td>
                <td>${itemCount}</td>
                <td>${formatDate(order.created_at)}</td>
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
        if(el) {
            el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderOrders);
        }
    });

    renderOrders(); // Chạy lần đầu

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

// Dropdown Avatar
document.addEventListener('DOMContentLoaded', function() {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    avatar.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});
