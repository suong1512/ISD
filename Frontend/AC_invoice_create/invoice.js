document.addEventListener('DOMContentLoaded', async function () {
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        showCustomAlert("No Order ID found!");
        window.location.href = '../list/O_list.html';
        return;
    }

    // Initialize UI for user info
    setupUserInfo();

            const authUser = JSON.parse(sessionStorage.getItem('authUser')) || {};

    // Block Admin from creating/confirming invoices
    if (authUser.role === 'ADMIN') {
        const createBtn = document.getElementById('createInvoiceBtn');
        const confirmBtn = document.getElementById('confirmInvoiceBtn');
        if (createBtn) createBtn.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        
        // Add a view-only message
        const msg = document.createElement('div');
        msg.style.padding = '15px';
        msg.style.textAlign = 'center';
        msg.style.color = '#888';
        msg.style.fontStyle = 'italic';
        msg.innerHTML = '<i class="fas fa-eye"></i> View-only mode for Administrator.';
        document.querySelector('.action-buttons').appendChild(msg);
    }

    try {
        const response = await apiGet(`/orders/${orderId}`);
        const order = response.data;
        
        if (order) {
            populateOrderInfo(order);
            renderInvoiceItems(order);

            // Check if invoice exists in DB result from getOrderById
            if (order.invoice) {
                // Restore visual layout of completed invoice creation
                document.getElementById('invoiceSuccessMsg').style.display = 'block';
                
                const createBtn = document.getElementById('createInvoiceBtn');
                if(createBtn) {
                    createBtn.disabled = true;
                    createBtn.style.opacity = '0.6';
                    createBtn.style.cursor = 'not-allowed';
                }
                
                const confirmBtn = document.getElementById('confirmInvoiceBtn');
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.cursor = 'pointer';
                }
                
                const genPdfBtn = document.getElementById('generatePdfBtn');
                if (genPdfBtn) {
                    genPdfBtn.disabled = false;
                    genPdfBtn.style.opacity = '1';
                    genPdfBtn.style.cursor = 'pointer';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load order:', error);
        showCustomAlert("Failed to load order details. Please try again.");
    }

    // Set up button event listeners
    document.getElementById('createInvoiceBtn').addEventListener('click', async () => {
        const btn = document.getElementById('createInvoiceBtn');
        const originalHtml = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const subtotalText = document.getElementById('subtotalAmount').innerText.replace(/[^\d]/g, '');
            const taxText = document.getElementById('taxAmount').innerText.replace(/[^\d]/g, '');
            const totalText = document.getElementById('totalAmount').innerText.replace(/[^\d]/g, '');
            const authUser = JSON.parse(localStorage.getItem('authUser')) || { id: 2 };

            await apiPost(`/orders/${orderId}/invoice`, {
                subtotal: parseInt(subtotalText),
                tax: parseInt(taxText),
                total: parseInt(totalText),
                created_by: authUser.id
            });

            // Show success message
            document.getElementById('invoiceSuccessMsg').style.display = 'block';
            
            // Save local flag as backup for other logic if needed, but DB is primary now
            localStorage.setItem('invoice_created_' + orderId, 'true');
            
            // Disable create button permanently for this session
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
            btn.innerHTML = originalHtml;
            
            // Enable others
            const confirmBtn = document.getElementById('confirmInvoiceBtn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            }
            
            const genPdfBtn = document.getElementById('generatePdfBtn');
            if (genPdfBtn) {
                genPdfBtn.disabled = false;
                genPdfBtn.style.opacity = '1';
                genPdfBtn.style.cursor = 'pointer';
            }
            
            
            showCustomAlert('Invoice saved to database successfully!');
        } catch (error) {
            console.error('Invoice creation failed:', error);
            showCustomAlert('Failed to save invoice: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    document.getElementById('confirmInvoiceBtn').addEventListener('click', async () => {
        const isConfirmed = await showCustomConfirm('Are you sure you want to confirm and complete this invoice?');
        if (!isConfirmed) return;
        const btn = document.getElementById('confirmInvoiceBtn');
        const originalHtml = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing...';

        try {
                    const authUser = JSON.parse(sessionStorage.getItem('authUser')) || {};
            await apiPatch(`/orders/${orderId}/complete`, { confirmed_by: authUser.id || 2 });
            await showCustomAlert('Invoice confirmed and order completed successfully!', 'Success', 'success');
            window.location.href = '../AC_tasks/AC_dash.html';
        } catch (error) {
            console.error('Confirm action failed:', error);
            showCustomAlert("Error: " + error.message, 'Error', 'error');
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    document.getElementById('generatePdfBtn').addEventListener('click', () => {
        showCustomAlert('Generating PDF... (Demo)');
        window.print();
    });
});

function setupUserInfo() {
    const initials = sessionStorage.getItem('userInitials') || 'AC';
    const fullName = sessionStorage.getItem('currentUser') || 'Accountant';
    
    const avatar = document.getElementById('avatarTrigger');
    const dropdownName = document.getElementById('dropdownName');
    
    if (avatar) avatar.innerText = initials;
    if (dropdownName) dropdownName.innerText = fullName;

    // Toggle dropdown
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown').classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && !avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function populateOrderInfo(order) {
    document.getElementById('orderCode').innerText = `#${order.order_code}`;
    const statusEl = document.getElementById('orderStatus');
    statusEl.innerText = mapStatus(order.status).toUpperCase();
    
    // Dynamic badge class based on global colors
    statusEl.className = "badge";
    const s = (order.status || "").toLowerCase();
    if (s.includes("awaiting_approval")) statusEl.classList.add("badge-urgent");
    else if (s.includes("qc")) statusEl.classList.add("badge-purple");
    else if (s.includes("awaiting_invoice")) statusEl.classList.add("badge-lime");
    else if (s.includes("rejected")) statusEl.classList.add("badge-danger");
    else if (s.includes("confirmed") || s.includes("completed")) statusEl.classList.add("badge-success");
    else if (s.includes("prepare")) statusEl.classList.add("badge-info");
    else if (s.includes("shipping")) statusEl.classList.add("badge-orange");
    else statusEl.classList.add("badge-neutral");
    
    document.getElementById('customerName').value = order.customer_name || 'N/A';
    document.getElementById('companyName').value = order.company_name || 'N/A';
    document.getElementById('phoneNumber').value = order.phone || 'N/A';
    document.getElementById('shippingAddress').value = order.address || 'N/A';
    document.getElementById('emailAddress').value = order.email || 'N/A';
}

function renderInvoiceItems(order) {
    const container = document.getElementById('invoiceItems');
    const items = order.items || [];
    
    if (items.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center">No items found in this order.</td></tr>';
        updateTotals(0);
        return;
    }

    let subtotal = 0;
    
    container.innerHTML = items.map(item => {
        const qty = item.quantity || 0;
        const price = item.unit_price || 0;
        const amount = qty * price;
        subtotal += amount;

        return `
            <tr>
                <td>${item.product_name || 'Product'}</td>
                <td class="text-center">${qty}</td>
                <td class="text-right">${price.toLocaleString('vi-VN')} đ</td>
                <td class="text-right">${amount.toLocaleString('vi-VN')} đ</td>
            </tr>
        `;
    }).join('');

    updateTotals(subtotal);
}

function updateTotals(subtotal) {
    const taxRate = 0.10; // 10% VAT in VN generally expected when using VND
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    document.getElementById('subtotalAmount').innerText = `${subtotal.toLocaleString('vi-VN')} đ`;
    document.getElementById('taxAmount').innerText = `${tax.toLocaleString('vi-VN')} đ`;
    document.getElementById('totalAmount').innerText = `${total.toLocaleString('vi-VN')} đ`;
}
