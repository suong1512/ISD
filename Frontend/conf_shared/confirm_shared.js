/**
 * ============================================
 * SHARED CONFIRMATION PAGE MODULE
 * Reused by: Preparing, QC Checking, Shipping
 * ============================================
 *
 * Usage (in page-specific JS):
 *   initConfirmationPage({
 *       filterStatus: 'CONFIRMED',           // Backend status to filter orders
 *       confirmEndpoint: (id) => `/orders/${id}/prepare`,
 *       confirmButtonText: 'Confirm Prepared',
 *       confirmSuccessMsg: (id) => `Order #${id} marked as Prepared!`,
 *       pageTitle: 'Prepare Confirmation'
 *   });
 */

async function initConfirmationPage(config) {
    const {
        filterStatus,
        confirmEndpoint,
        confirmButtonText,
        confirmSuccessMsg,
        pageTitle,
        detailUrl,
        detailBtnText
    } = config;

    const orderGrid = document.getElementById('orderGrid');
    const pendingCountBadge = document.getElementById('pendingCount');

    await renderOrders();

    async function renderOrders() {
        let allOrders = [];
        try {
            const response = await apiGet('/orders');
            allOrders = response.data || [];
        } catch (error) {
            console.error('Failed to load orders:', error);
            orderGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load orders. Please check if the backend is running.</p>
                </div>`;
            return;
        }

        const filteredOrders = allOrders.filter(order => order.status === filterStatus);
        pendingCountBadge.innerHTML = `${filteredOrders.length} Pending`;

        if (filteredOrders.length === 0) {
            orderGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>There are currently no orders waiting for confirmation.</p>
                </div>`;
            return;
        }

        // Render cards
        orderGrid.innerHTML = filteredOrders.map(order => {
            const today = new Date();
            let relevantDeadline = null;
            let isDelayedOnBackend = false;

            switch (order.status) {
                case 'AWAITING_APPROVAL':
                    relevantDeadline = order.expected_delivery_date;
                    isDelayedOnBackend = order.is_delivery_delayed;
                    break;
                case 'CONFIRMED':
                case 'PREPARING':
                    relevantDeadline = order.prepare_deadline;
                    isDelayedOnBackend = order.is_prepare_delayed;
                    break;
                case 'QC':
                    relevantDeadline = order.qc_deadline;
                    isDelayedOnBackend = order.is_qc_delayed;
                    break;
                case 'SHIPPING':
                    relevantDeadline = order.shipping_deadline;
                    isDelayedOnBackend = order.is_shipping_delayed;
                    break;
                case 'AWAITING_INVOICE':
                    relevantDeadline = order.expected_delivery_date;
                    isDelayedOnBackend = order.is_delivery_delayed;
                    break;
                default:
                    relevantDeadline = order.expected_delivery_date;
            }

            const deadlineText = relevantDeadline ? new Date(relevantDeadline).toISOString().split('T')[0] : 'No deadline set';
            const isActuallyOverdue = isDelayedOnBackend || (relevantDeadline && new Date(relevantDeadline) < today);

            const isInvoiceCreated = localStorage.getItem('invoice_created_' + order.id) === 'true';
            const invoiceCreatedHtml = isInvoiceCreated ? `
                <div class="deadline-box">
                    <i class="fas fa-file-invoice-dollar" style="color: #2d7a5d;"></i> Invoice Created
                </div>` : '';

            const cardClickHtml = config.cardClickUrl ? `onclick="goToSpecificPage('${order.id}', '${config.cardClickUrl}')" style="cursor: pointer;"` : '';

            return `
            <div class="order-card" id="order-${order.id}" ${cardClickHtml}>
                <div class="card-header">
                    <div>
                        <span class="order-label">ORDER ID</span>
                        <div class="order-number">${order.order_code || '#' + order.id}</div>
                    </div>
                    <button class="btn-detail" onclick="event.stopPropagation(); goToSpecificPage('${order.id}', '${config.detailUrl || '../detail/detail.html'}')">${config.detailBtnText || 'Order Detail'}</button>
                </div>

                <div class="customer-name">
                    <i class="fas fa-building"></i> ${order.customer_name || 'N/A'}
                </div>

                <div class="deadline-box ${isActuallyOverdue ? 'overdue' : ''}">
                    <i class="fas fa-calendar-alt"></i> Deadline: ${deadlineText} ${isActuallyOverdue ? '(Overdue)' : ''}
                </div>
                ${invoiceCreatedHtml}

                <div class="attachment-box" id="attach-${order.id}">
                    <div class="file-info">
                        <i class="fas fa-spinner fa-spin file-icon"></i>
                        <span class="file-name">Loading document...</span>
                    </div>
                </div>

                ${(filterStatus === 'AWAITING_INVOICE' && !isInvoiceCreated) ? `
                <button class="btn-confirm-action" id="btn-confirm-${order.id}" style="background-color: #e0e0e0; color: #888; cursor: not-allowed;" onclick="event.stopPropagation(); alert('Vui lòng tạo Invoice trước khi confirm và complete!');">
                    <i class="fas fa-lock"></i> Create Invoice First
                </button>
                ` : `
                <button class="btn-confirm-action" id="btn-confirm-${order.id}" onclick="event.stopPropagation(); confirmAction('${order.id}', '${order.order_code || '#' + order.id}')">
                    <i class="fas fa-check-circle"></i> ${confirmButtonText}
                </button>
                `}
            </div>
            `;
        }).join('');

        // Load attachments for each order
        filteredOrders.forEach(order => {
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
                                <a href="/${filePath}" target="_blank" class="btn-view-file" title="View file" onclick="event.stopPropagation();">
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

                    // Strict check for invoice logic
                    if (filterStatus === 'AWAITING_INVOICE') {
                        const btn = document.getElementById(`btn-confirm-${order.id}`);
                        if (btn) {
                            if (data.invoice) {
                                btn.style = '';
                                btn.className = 'btn-confirm-action';
                                btn.onclick = (e) => { e.stopPropagation(); confirmAction(String(order.id), order.order_code || '#' + order.id); };
                                btn.innerHTML = `<i class="fas fa-check-circle"></i> ${confirmButtonText}`;
                                
                                const card = document.getElementById(`order-${order.id}`);
                                if (card && !card.innerHTML.includes('Invoice Created')) {
                                    const aBox = document.getElementById(`attach-${order.id}`);
                                    if (aBox) {
                                        aBox.insertAdjacentHTML('beforebegin', `
                                            <div class="deadline-box">
                                                <i class="fas fa-file-invoice-dollar" style="color: #2d7a5d;"></i> Invoice Created
                                            </div>
                                        `);
                                    }
                                }
                            } else {
                                btn.style.backgroundColor = '#e0e0e0';
                                btn.style.color = '#888';
                                btn.style.cursor = 'not-allowed';
                                btn.onclick = (e) => { e.stopPropagation(); showCustomAlert('Please create Invoice before confirming and completing!', 'Action Required', 'info'); };
                                btn.innerHTML = `<i class="fas fa-lock"></i> Create Invoice First`;
                            }
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to load attachment for order', order.id, err);
                    const attachBox = document.getElementById(`attach-${order.id}`);
                    if (attachBox) {
                        attachBox.innerHTML = `
                            <div class="file-info">
                                <i class="fas fa-exclamation-circle file-icon" style="color: #d32f2f;"></i>
                                <span class="file-name" style="color: #d32f2f;">Error loading document</span>
                            </div>`;
                    }
                });
        });
    }

    // Expose confirm action globally
    window.confirmAction = async function(orderId, orderCode) {
        const btn = document.getElementById(`btn-confirm-${orderId}`);
        let originalHtml = '';
        
        if (btn) {
            btn.disabled = true;
            originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        try {
            const userId = JSON.parse(sessionStorage.getItem('authUser'))?.id || 2;
            await apiPatch(confirmEndpoint(orderId), { confirmed_by: userId });
            await showCustomAlert(confirmSuccessMsg(orderCode || orderId), 'Success', 'success');
            renderOrders();
        } catch (error) {
            console.error('Confirm action failed:', error);
            showCustomAlert("Error: " + error.message, 'Error', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    };
    window.goToSpecificPage = function(orderId, targetUrl) {
        sessionStorage.setItem('currentOrderId', orderId);
        window.location.href = targetUrl;
    };
}

// Preserve backwards compatibility
function goToDetail(orderId) {
    sessionStorage.setItem('currentOrderId', orderId);
    window.location.href = "../detail/detail.html";
}

