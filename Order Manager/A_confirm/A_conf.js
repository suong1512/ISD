document.addEventListener('DOMContentLoaded', () => {
    renderAdminOrders();
});

async function renderAdminOrders() {
    const orderGrid = document.getElementById('orderGrid');
    const pendingCountBadge = document.getElementById('pendingCount');
    
    let allOrders = [];
    try {
        const response = await apiGet('/orders');
        allOrders = response.data || [];
    } catch (error) {
        console.error('Failed to load orders:', error);
        orderGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 100px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; display: block; margin-bottom: 10px;"></i>
                <p>Failed to load orders. Please check if the backend is running.</p>
            </div>`;
        return;
    }
    
    // Lọc đơn hàng đang chờ duyệt (PENDING_APPROVAL)
    const pendingOrders = allOrders.filter(order => order.status === "PENDING_APPROVAL");

    // Cập nhật số lượng
    pendingCountBadge.innerHTML = `<i class="fas fa-clipboard-list"></i> ${pendingOrders.length} Pending`;

    if (pendingOrders.length === 0) {
        orderGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 100px;">
                <i class="fas fa-inbox" style="font-size: 3rem; display: block; margin-bottom: 10px;"></i>
                <p>There are currently no orders requiring approval.</p>
            </div>`;
        return;
    }

    // Render danh sách
    orderGrid.innerHTML = pendingOrders.map(order => `
        <div class="order-card" id="order-${order.id}">
            <div class="card-header">
                <div>
                    <span class="order-label">ORDER</span>
                    <div class="order-number">${order.order_code || '#' + order.id}</div>
                </div>
                <a href="javascript:void(0)" class="view-detail" onclick="goToDetail('${order.id}')">Order Detail</a>
            </div>
            
            <div class="customer-name">
                <i class="fas fa-building"></i> ${order.customer_name || 'N/A'}
            </div>
            <span class="status-tag">Awaiting Approval</span>

            <div class="attachment-box">
                <div class="file-info">
                    <i class="far fa-file-pdf"></i>
                    <span>Total: $${Number(order.total_amount).toLocaleString()}</span>
                </div>
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

async function updateStatus(orderId, action) {
    try {
        if (action === 'confirm') {
            await apiPatch(`/orders/${orderId}/confirm`, { confirmed_by: 2 }); // Admin user ID = 2
            alert("Success: Order #" + orderId + " is confirmed!");
        } else if (action === 'reject') {
            await apiPatch(`/orders/${orderId}/reject`, {});
            alert("Notice: Order #" + orderId + " is rejected.");
        }

        // Re-render danh sách
        renderAdminOrders();
    } catch (error) {
        console.error('Update status failed:', error);
        alert("Error: " + error.message);
    }
}

function goToDetail(orderId) {
    sessionStorage.setItem('currentOrderId', orderId);
    window.location.href = "../Detail/A_detail.html"; 
}