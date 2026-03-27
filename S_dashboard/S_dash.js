document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy dữ liệu từ LocalStorage (key dùng chung all_orders)
    const ordersRaw = localStorage.getItem('all_orders');
    const orders = ordersRaw ? JSON.parse(ordersRaw) : [];

    // 2. Thống kê
    const total = orders.length;
    const pending = orders.filter(o => ['Draft', 'Awaiting Approval', 'Pending'].includes(o.status)).length;
    const completed = orders.filter(o => o.status === "Completed").length;
    
    // Tính doanh thu
    const revenue = orders.reduce((sum, o) => {
        const val = typeof o.total === 'string' 
            ? parseFloat(o.total.replace(/[^0-9.]/g, '')) 
            : parseFloat(o.total);
        return sum + (isNaN(val) ? 0 : val);
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
    const recent = [...orders].reverse().slice(0, 4);
    if (recent.length > 0) {
        notiList.innerHTML = recent.map(o => `
            <li><i class="fas fa-bell"></i> New activity on Order <strong>${o.id}</strong></li>
        `).join('');
    } else {
        notiList.innerHTML = "<li>No recent activities found.</li>";
    }


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