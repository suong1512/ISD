document.addEventListener('DOMContentLoaded', async function () {
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        alert("No Order ID found!");
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

            // Determine if invoice was already created previously
            const isInvoiceCreated = localStorage.getItem('invoice_created_' + orderId) === 'true';
            if (isInvoiceCreated) {
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
        alert("Failed to load order details. Please try again.");
    }

    // Set up button event listeners
    document.getElementById('createInvoiceBtn').addEventListener('click', () => {
        // Show success message
        document.getElementById('invoiceSuccessMsg').style.display = 'block';
        
        // Save progress to local storage so outer cards know
        localStorage.setItem('invoice_created_' + orderId, 'true');
        
        // Disable create button
        const createBtn = document.getElementById('createInvoiceBtn');
        createBtn.disabled = true;
        createBtn.style.opacity = '0.6';
        createBtn.style.cursor = 'not-allowed';
        
        // Enable confirm button
        const confirmBtn = document.getElementById('confirmInvoiceBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        }
        
        // Enable generate PDF button
        const genPdfBtn = document.getElementById('generatePdfBtn');
        if (genPdfBtn) {
            genPdfBtn.disabled = false;
            genPdfBtn.style.opacity = '1';
            genPdfBtn.style.cursor = 'pointer';
        }
    });

    document.getElementById('confirmInvoiceBtn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to confirm and complete this invoice?')) return;
        try {
            const authUser = JSON.parse(localStorage.getItem('authUser')) || {};
            await apiPatch(`/orders/${orderId}/complete`, { confirmed_by: authUser.id || 2 });
            alert('Invoice confirmed and order completed successfully!');
            window.location.href = '../AC_tasks/AC_dash.html';
        } catch (error) {
            console.error('Confirm action failed:', error);
            alert("Error: " + error.message);
        }
    });

    document.getElementById('generatePdfBtn').addEventListener('click', () => {
        alert('Generating PDF... (Demo)');
        window.print();
    });
});

function setupUserInfo() {
    const initials = localStorage.getItem('userInitials') || 'AC';
    const fullName = localStorage.getItem('currentUser') || 'Accountant';
    
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
