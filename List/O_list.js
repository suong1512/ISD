// 1. Hàm bổ trợ lấy Class CSS cho Badge (Giữ nguyên như bản trước)
function getStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("awaiting approval")) return "badge-awaiting";
    if (s.includes("qc checked")) return "badge-qc";
    if (s.includes("awaiting invoice")) return "badge-invoice";
    if (s.includes("rejected")) return "badge-rejected";
    if (s.includes("confirmed")) return "badge-confirmed";
    if (s.includes("prepared")) return "badge-prepared";
    if (s.includes("shipping")) return "badge-shipping";
    if (s.includes("completed")) return "badge-completed";
    return "badge-draft"; 
}


// 2. Hàm điều hướng
function goToDetail(id) {
    if(!id || id === 'undefined' || id === 'N/A') {
        alert("Invalid ID");
        return;
    }

    const orders = JSON.parse(localStorage.getItem('all_orders')) || [];
    const currentOrder = orders.find(o => String(o.id) === String(id));

    if (currentOrder && currentOrder.status === "Draft") {
        window.location.href = `../Create/index.html?edit=${id}`;
    } else {
        sessionStorage.setItem('currentOrderId', id);
        window.location.href = '../Detail/detail.html';
    }
}

// 3. Khởi tạo khi trang tải xong
document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('orderTableBody');
    const searchInput = document.getElementById('mainSearch');
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const deptFilter = document.getElementById('deptFilter');

    function renderOrders() {
        const orders = JSON.parse(localStorage.getItem('all_orders')) || [];
        const filterStatus = statusFilter.value;
        const filterPriority = priorityFilter.value;
        const filterDept = deptFilter.value;
        const searchTerm = searchInput.value.toLowerCase();

        const validIds = [];

        orders.forEach(order => {
            const currentStatus = order.status || "Awaiting Approval";
            
            // Lọc dữ liệu
            const matchesStatus = (filterStatus === "All" || currentStatus === filterStatus);
            const matchesPriority = (filterPriority === "All" || (order.priority || "Low") === filterPriority);
            const matchesDept = (filterDept === "All" || (order.dept || "N/A") === filterDept);
            
            const orderId = order.id ? String(order.id).toLowerCase() : "";
            const customerName = order.customer ? String(order.customer).toLowerCase() : "";
            const matchesSearch = (orderId.includes(searchTerm) || customerName.includes(searchTerm));

            if (matchesStatus && matchesPriority && matchesDept && matchesSearch) {
                validIds.push(String(order.id));

                // Xử lý Class cho từng cột
                const statusClass = getStatusClass(currentStatus);
                const priorityClass = `priority-${(order.priority || 'low').toLowerCase()}`;
                const deptClass = `dept-${(order.dept || 'na').toLowerCase().replace(/\s/g, '')}`;

                const rowInnerContent = `
                    <td class="order-id-cell">#${order.id || 'N/A'}</td>
                    <td>${order.customer || 'N/A'}</td>
                    <td><span class="badge ${deptClass}">${order.dept || 'N/A'}</span></td>
                    <td><span class="badge ${priorityClass}">${order.priority || 'Low'}</span></td>
                    <td><span class="badge ${statusClass}">${currentStatus}</span></td>
                    <td>${order.deadline || '---'}</td>
                    <td>${order.total || '0'}</td>
                    <td>${order.created || '---'}</td>
                    <td style="text-align: center;">
                        <i class="fas fa-external-link-alt" 
                           style="cursor:pointer; color: #2d7a5d; font-size: 16px;" 
                           onclick="goToDetail('${order.id}')"></i>
                    </td>
                `;

                let existingRow = document.querySelector(`tr[data-id="${order.id}"]`);
                if (!existingRow) {
                    const newRow = document.createElement('tr');
                    newRow.setAttribute('data-id', order.id);
                    newRow.innerHTML = rowInnerContent;
                    tableBody.appendChild(newRow);
                } else {
                    existingRow.innerHTML = rowInnerContent;
                }
            }
        });

        // Xóa các dòng không khớp filter
        const allRows = tableBody.querySelectorAll('tr');
        allRows.forEach(row => {
            if (!validIds.includes(row.getAttribute('data-id'))) {
                row.remove();
            }
        });
    }

    // Gán sự kiện lọc
    [searchInput, statusFilter, priorityFilter, deptFilter].forEach(el => {
        if(el) {
            el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderOrders);
        }
    });

    renderOrders(); // Chạy lần đầu


    // 1. Lấy thông tin từ LocalStorage
    const initials = localStorage.getItem('userInitials');
    const fullName = localStorage.getItem('currentUser');
    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.querySelector('.dropdown-header strong');

    // 2. Cập nhật vào giao diện nếu có dữ liệu
    if (initials && avatarElement) {
        avatarElement.innerText = initials;
    }
    
    // Cập nhật tên trong Menu Dropdown (phần Logout bạn vừa làm)
    if (fullName && dropdownName) {
        dropdownName.innerText = fullName;
    }
});




document.addEventListener('DOMContentLoaded', function() {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    // Toggle menu khi bấm vào Avatar
    avatar.addEventListener('click', function(e) {
        e.stopPropagation(); // Ngăn sự kiện nổi bọt
        dropdown.classList.toggle('active');
    });

    // Đóng menu nếu bấm ra ngoài màn hình
    document.addEventListener('click', function(e) {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});
