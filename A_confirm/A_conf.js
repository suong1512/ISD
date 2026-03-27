document.addEventListener('DOMContentLoaded', () => {
    renderAdminOrders();
});

function renderAdminOrders() {
    const orderGrid = document.getElementById('orderGrid');
    const pendingCountBadge = document.getElementById('pendingCount');
    
    // 1. Lấy dữ liệu từ LocalStorage
    const allOrders = JSON.parse(localStorage.getItem('all_orders')) || [];
    
    // 2. Lọc đơn hàng đang chờ duyệt
    const pendingOrders = allOrders.filter(order => order.status === "Awaiting Approval");

    // 3. Cập nhật số lượng trên Badge
    pendingCountBadge.innerHTML = `<i class="fas fa-clipboard-list"></i> ${pendingOrders.length} Pending`;

    // 4. Nếu không có đơn, hiện thông báo trống
    if (pendingOrders.length === 0) {
        orderGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 100px;">
                <i class="fas fa-inbox" style="font-size: 3rem; display: block; margin-bottom: 10px;"></i>
                <p>There are currently no orders requiring approval.</p>
            </div>`;
        return;
    }

    // 5. Render danh sách (Dùng template literal chính xác)
    orderGrid.innerHTML = pendingOrders.map(order => `
        <div class="order-card" id="order-${order.id}">
            <div class="card-header">
                <div>
                    <span class="order-label">ORDER ID</span>
                    <div class="order-number">#${order.id}</div>
                </div>
                <a href="javascript:void(0)" class="view-detail" onclick="goToDetail('${order.id}')">Order Detail</a>
            </div>
            
            <div class="customer-name">
                <i class="fas fa-building"></i> ${order.customer || 'N/A'}
            </div>
            <span class="status-tag">Awaiting Approval</span>

            <div class="attachment-box">
                <div class="file-info">
                    <i class="far fa-file-pdf"></i>
                    <span>${(order.files && order.files.length > 0) ? order.files[0].name : 'No attachment'}</span>
                </div>
                <i class="far fa-eye"></i>
            </div>

            <div class="card-actions">
                <button class="btn btn-confirm" onclick="updateStatus('${order.id}', 'confirm')">
                    <i class="fas fa-check-circle"></i> Confirm Order
                </button>
                <button class="btn btn-reject" onclick="updateStatus('${order.id}', 'reject')">
                    <i class="fas fa-undo"></i> Reject to Sales
                </button>
            </div>
        </div>
    `).join('');
}

function updateStatus(orderId, action) {
    let allOrders = JSON.parse(localStorage.getItem('all_orders')) || [];
    
    // Tìm và cập nhật đúng đơn hàng dựa trên ID
    allOrders = allOrders.map(order => {
        if (String(order.id) === String(orderId)) {
            if (action === 'confirm') {
                // Duyệt: Chuyển sang In Progress và step 2
                return { ...order, status: 'Confirmed', step: 2 }; 
            } else if (action === 'reject') {
                // Từ chối: Chuyển về trạng thái Rejected
                return { ...order, status: 'Rejected', step: 0 };
            }
        }
        return order;
    });

    // Lưu lại vào LocalStorage
    localStorage.setItem('all_orders', JSON.stringify(allOrders));
    
    // Thông báo cho Admin
    if (action === 'confirm') {
        alert("Success: Order #" + orderId + " is confirmed!");
    } else {
        alert("Notice: Order #" + orderId + " is rejected.");
    }
    
    // Vẽ lại danh sách ngay lập tức để đơn hàng vừa duyệt biến mất khỏi danh sách chờ
    renderAdminOrders();
}


function goToDetail(orderId) {
    // 1. Lưu ID vào sessionStorage (giống cách trang List làm)
    sessionStorage.setItem('currentOrderId', orderId);
    
    // 2. Chuyển hướng sang trang Detail
    // Lưu ý: Kiểm tra lại đường dẫn (path) từ folder Admin sang folder Detail của bạn
    window.location.href = "../Detail/A_detail.html"; 
}