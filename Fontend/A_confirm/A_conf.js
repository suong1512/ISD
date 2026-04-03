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

    const pendingOrders = allOrders.filter(order => order.status === "AWAITING_APPROVAL");
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
                <i class="fas fa-external-link-alt" style="cursor:pointer; color: #2d7a5d; font-size: 18px;" onclick="goToDetail('${order.id}')" title="Order Detail"></i>
            </div>
            
            <div class="customer-name">
                <i class="fas fa-building"></i> ${order.customer_name || 'N/A'}
            </div>
            <span class="badge badge-urgent">Awaiting Approval</span>

            <div class="attachment-box" id="attach-${order.id}" style="padding: 10px; background: #f8f9fa; border-radius: 6px; margin: 15px 0;">
                <div class="file-info" style="color: #666;">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading document...</span>
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

    pendingOrders.forEach(order => {
        apiGet(`/orders/${order.id}`)
            .then(res => {
                const data = res.data;
                const attachments = data.attachments || [];
             
                const customerFiles = attachments.filter(a => a.file_type === 'CUSTOMER');
                const attachBox = document.getElementById(`attach-${order.id}`);

                if (attachBox) {
                    if (customerFiles.length > 0) {
                        const htmlList = customerFiles.map(f => {
                            const ext = (f.file_name || '').split('.').pop().toLowerCase();
                            let icon = 'fa-file-alt';
                            if (['pdf'].includes(ext)) icon = 'fa-file-pdf';
                            else if (['doc', 'docx'].includes(ext)) icon = 'fa-file-word';
                            else if (['xls', 'xlsx'].includes(ext)) icon = 'fa-file-excel';
                            else if (['jpg', 'jpeg', 'png'].includes(ext)) icon = 'fa-file-image';

                            const filePath = f.file_path ? f.file_path.replace(/\\/g, '/') : '';

                            return `<div class="file-info" style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                                <i class="far ${icon}" style="color: #dc3545; font-size: 18px;"></i>
                                <a href="/${filePath}" target="_blank" style="text-decoration: none; color: #1976d2; font-weight: 500; font-size: 14px;">${f.file_name || 'Document'}</a>
                            </div>`;
                        }).join('');
                        attachBox.innerHTML = htmlList;
                    } else {
                        attachBox.innerHTML = `<div class="file-info" style="color: #888;">
                            <i class="far fa-file"></i>
                            <span style="margin-left: 8px;">No document uploaded</span>
                        </div>`;
                    }
                }
            })
            .catch(err => {
                console.error('Failed to load attachment for order', order.id, err);
                const attachBox = document.getElementById(`attach-${order.id}`);
                if (attachBox) attachBox.innerHTML = `<div class="file-info" style="color: #d32f2f;"><i class="fas fa-exclamation-circle"></i><span style="margin-left: 8px;">Error loading document</span></div>`;
            });
    });
}

async function updateStatus(orderId, action) {
    try {
        if (action === 'confirm') {
            await apiPatch(`/orders/${orderId}/confirm`, { confirmed_by: JSON.parse(localStorage.getItem('authUser'))?.id || 2 });
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