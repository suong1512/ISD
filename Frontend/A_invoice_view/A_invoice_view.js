document.addEventListener('DOMContentLoaded', async function () {
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        showCustomAlert("Order reference not found!", 'Error', 'error');
        window.location.href = '../list/O_list.html';
        return;
    }

    // Initialize UI for user info
    setupUserInfo();

    try {
        const response = await apiGet(`/orders/${orderId}`);
        const order = response.data;
        
        if (order) {
            populateOrderInfo(order);
            renderInvoiceItems(order);
        }
    } catch (error) {
        console.error('Failed to load order:', error);
        showCustomAlert("Failed to load order details. Please try again.", 'Error', 'error');
    }

    // PDF generation button
    document.getElementById('generatePdfBtn').addEventListener('click', () => {
        showCustomAlert('Generating PDF... (Demo)', 'Info', 'info');
        window.print();
    });
});

function setupUserInfo() {
    const initials = localStorage.getItem('userInitials') || 'A0';
    const fullName = localStorage.getItem('currentUser') || 'Admin';
    
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
