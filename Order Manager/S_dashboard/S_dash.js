document.addEventListener('DOMContentLoaded', async function() {
    let orders = [];

    // 1. Lấy dữ liệu từ API
    try {
        const response = await apiGet('/orders');
        orders = response.data || [];
    } catch (error) {
        console.error('Failed to load orders for dashboard:', error);
    }

    // 2. Thống kê
    const total = orders.length;
    const pending = orders.filter(o => ['DRAFT', 'PENDING_APPROVAL'].includes(o.status)).length;
    const completed = orders.filter(o => o.status === "DELIVERED").length;
    
    // Tính doanh thu từ total_amount
    const revenue = orders.reduce((sum, o) => {
        const val = Number(o.total_amount) || 0;
        return sum + val;
    }, 0);

    // Cập nhật UI
    document.getElementById('totalOrders').innerText = total;
    document.getElementById('pendingOrders').innerText = pending;
    document.getElementById('completedOrders').innerText = completed;
    document.getElementById('totalRevenue').innerText = `$${revenue.toLocaleString()}`;

    // 3. Biểu đồ
    const ctx = document.getElementById('orderChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Completed', 'Other'],
            datasets: [{
                data: [pending, completed, total - (pending + completed)],
                backgroundColor: ['#f9a825', '#2d7a5d', '#1976d2'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 4. Thông báo (lấy 4 đơn gần nhất)
    const notiList = document.getElementById('notificationList');
    const recent = orders.slice(0, 4);
    if (recent.length > 0) {
        notiList.innerHTML = recent.map(o => `
            <li><i class="fas fa-bell"></i> New activity on Order <strong>${o.order_code}</strong> - ${mapStatus(o.status)}</li>
        `).join('');
    } else {
        notiList.innerHTML = "<li>No recent activities found.</li>";
    }

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