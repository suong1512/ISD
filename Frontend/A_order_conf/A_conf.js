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
                    <span class="order-label">ORDER CODE</span>
                    <div class="order-number">${order.order_code || '#' + order.id}</div>
                </div>
                <button class="btn-detail" onclick="goToDetail('${order.id}')">Order Detail</button>
            </div>
            
            <div class="customer-name">
                <i class="fas fa-building"></i> ${order.customer_name || 'N/A'}
            </div>

            <div class="deadline-box">
                <i class="fas fa-calendar-alt"></i> Deadline: ${order.expected_delivery_date ? new Date(order.expected_delivery_date).toISOString().split('T')[0] : '---'}
            </div>

            <div class="attachment-box" id="attach-${order.id}">
                <div class="file-info">
                    <i class="fas fa-spinner fa-spin file-icon"></i>
                    <span class="file-name">Loading document...</span>
                </div>
            </div>

            <div class="card-actions">
                <button class="btn-confirm-action" onclick="updateStatus('${order.id}', 'confirm', '${order.order_code || ''}')">
                    <i class="fas fa-check-circle"></i> Confirm Order
                </button>
                <button class="btn-reject-action" onclick="updateStatus('${order.id}', 'reject', '${order.order_code || ''}')">
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
                            const file = customerFiles[0];
                            const filePath = file.file_path ? file.file_path.replace(/\\/g, '/') : '';
                            attachBox.innerHTML = `
                                <div class="file-info">
                                    <i class="fas fa-file-alt file-icon"></i>
                                    <span class="file-name">${file.file_name || 'Document'}</span>
                                </div>
                                <a href="/${filePath}" target="_blank" class="btn-view-file" title="View file">
                                    <i class="fas fa-eye"></i>
                                </a>`;
                        } else {
                            attachBox.innerHTML = `
                                <div class="file-info">
                                    <i class="far fa-file file-icon" style="color: #aaa;"></i>
                                    <span class="file-name" style="color: #aaa;">No document uploaded</span>
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

async function updateStatus(orderId, action, orderCode = "") {
    const card = document.getElementById(`order-${orderId}`);
    const btns = card ? card.querySelectorAll('.card-actions button') : [];
    const targetBtn = action === 'confirm' ? btns[0] : btns[1];
    let originalHtml = '';

    if (btns.length > 0) {
        btns.forEach(b => b.disabled = true);
        originalHtml = targetBtn.innerHTML;
        targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        if (action === 'confirm') {
            await apiPatch(`/orders/${orderId}/confirm`, { confirmed_by: JSON.parse(sessionStorage.getItem('authUser'))?.id || 2 });
            await showCustomAlert(`Success: Order ${orderCode} moved to Preparing!`, 'Confirmed', 'success');
        } else if (action === 'reject') {
            await apiPatch(`/orders/${orderId}/reject`, {});
            await showCustomAlert(`Notice: Order ${orderCode} is rejected.`, 'Rejected', 'info');
        }

        // Re-render danh sách
        renderAdminOrders();
    } catch (error) {
        console.error('Update status failed:', error);
        showCustomAlert("Error: " + error.message, 'Error', 'error');
        if (btns.length > 0) {
            btns.forEach(b => b.disabled = false);
            targetBtn.innerHTML = originalHtml;
        }
    }
}

function goToDetail(orderId) {
    sessionStorage.setItem('currentOrderId', orderId);
    window.location.href = "../detail/detail.html";
}
