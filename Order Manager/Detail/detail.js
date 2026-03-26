document.addEventListener('DOMContentLoaded', async function () {
    // 1. Lấy ID từ sessionStorage
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        alert("Không tìm thấy mã đơn hàng!");
        window.location.href = '../List/O_list.html';
        return;
    }

    // 2. Lấy chi tiết đơn hàng từ API
    let currentOrder;
    try {
        const response = await apiGet(`/orders/${orderId}`);
        currentOrder = response.data;
    } catch (error) {
        console.error('Failed to load order:', error);
        alert("Failed to load order: " + error.message);
        window.location.href = '../List/O_list.html';
        return;
    }

    if (!currentOrder) {
        alert("Order data not found!");
        window.location.href = '../List/O_list.html';
        return;
    }

    // 3. Đổ dữ liệu cơ bản vào HTML
    // Thêm dấu # vào trước order_code trả về từ API
    document.getElementById('orderId').innerText = "#" + currentOrder.order_code;
    document.getElementById('customerName').innerText = currentOrder.customer_name || "N/A";

    // Thông tin khách hàng mở rộng
    document.getElementById('detCompany').innerText = currentOrder.company_name || "N/A";
    document.getElementById('detAddress').innerText = currentOrder.address || "No address";
    document.getElementById('detEmail').innerText = currentOrder.email || "N/A";

    // Thông tin Logistics & Deadlines
    document.getElementById('detExpectedDate').innerText = currentOrder.expected_delivery_date || "---";
    document.getElementById('detDeadlinePrepare').innerText = currentOrder.prepare_deadline || "---";
    document.getElementById('detDeadlineQC').innerText = currentOrder.qc_deadline || "---";
    document.getElementById('detDeadlineShipping').innerText = currentOrder.shipping_deadline || "---";

    // Format created_at
    const createdDate = currentOrder.created_at
        ? new Date(currentOrder.created_at).toISOString().split('T')[0]
        : "---";
    document.getElementById('detCreatedDate').innerText = createdDate;

    // 4. Danh sách sản phẩm
    const productContainer = document.getElementById('productListContainer');
    if (currentOrder.items && currentOrder.items.length > 0) {
        productContainer.innerHTML = currentOrder.items.map(item => `
            <div class="product-card">
                <h3>${item.product_name || 'Unknown Product'}</h3>
                <p>Qty: <strong>${item.quantity || 0}</strong> Units</p>
                <p style="font-size: 12px; color: #888;">Unit Price: $${Number(item.unit_price).toLocaleString()} | Subtotal: $${Number(item.subtotal).toLocaleString()}</p>
            </div>
        `).join('');
    } else {
        productContainer.innerHTML = `<p style="color:#999; padding: 20px;">No products listed.</p>`;
    }

    // 5. File đính kèm
    const fileContainer = document.getElementById('fileListContainer');
    if (currentOrder.attachments && currentOrder.attachments.length > 0) {
        fileContainer.innerHTML = currentOrder.attachments.map(att => {
            let icon = "fa-file-alt";
            const fileName = att.file_name.toLowerCase();
            if (fileName.endsWith('.pdf')) icon = "fa-file-pdf";
            if (fileName.match(/\.(xlsx|csv|xls)$/)) icon = "fa-file-excel";
            if (fileName.match(/\.(jpg|jpeg|png)$/)) icon = "fa-file-image";

            const isSupplierFile = att.file_type === 'SUPPLIER';
            const downloadUrl = `${API_BASE_URL}/${att.file_path}`;

            return `
                <a href="${downloadUrl}" download="${att.file_name}" class="file-item" target="_blank"
                style="text-decoration: none; color: inherit; ${isSupplierFile ? 'border-left: 4px solid #2d7a5d; background: #f0f9f6;' : ''}">
                    <span>
                        <i class="fas ${icon}" style="margin-right: 8px; ${isSupplierFile ? 'color: #2d7a5d;' : ''}"></i> 
                        ${att.file_name}
                        ${att.uploaded_by_name ? `<small style="color:#888; margin-left:5px;">(by ${att.uploaded_by_name})</small>` : ''}
                    </span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${isSupplierFile ? '<span style="font-size: 9px; color: #2d7a5d; font-weight: bold;">SUPPLIER</span>' : ''}
                        <i class="fas fa-download"></i>
                    </div>
                </a>
            `;
        }).join('');
    } else {
        fileContainer.innerHTML = `<p style="color:#999; font-size: 13px; padding: 10px;">No files attached.</p>`;
    }

    // 6. Trạng thái và Timeline
    const displayStatus = mapStatus(currentOrder.status);
    renderStatusBadge(displayStatus);
    updateTimeline(displayStatus);
    renderTaskPanel(currentOrder);

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

    // 7. Upload file từ trang Detail
    document.getElementById('supplierFileInput').addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('fileNameDisplay').innerText = file.name;

        try {
            await apiUploadFile(`/orders/${orderId}/attachments`, file);
            alert(`Uploaded: ${file.name}`);
            location.reload();
        } catch (error) {
            console.error('Upload failed:', error);
            alert("Upload failed: " + error.message);
        }
    });
});

// Dropdown Avatar
document.addEventListener('DOMContentLoaded', function () {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    avatar.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});

/**
 * Hàm hiển thị Badge trạng thái
 */
function renderStatusBadge(status) {
    const statusBadge = document.querySelector('.order-info-block .badge');
    if (!statusBadge) return;

    statusBadge.innerText = status.toUpperCase();

    const colors = {
        'draft': { bg: '#eeeeee', text: '#666666' },
        'awaiting approval': { bg: '#fff8e1', text: '#f9a825' },
        'confirmed': { bg: '#e8f5e9', text: '#2e7d32' },
        'rejected': { bg: '#ffebee', text: '#c62828' },
        'prepare': { bg: '#e3f2fd', text: '#1976d2' },
        'qc checked': { bg: '#f3e5f5', text: '#7b1fa2' },
        'shipping': { bg: '#e0f2f1', text: '#00695c' },
        'completed': { bg: '#e8f5e9', text: '#2e7d32' },
        'delayed': { bg: '#fff3e0', text: '#ef6c00' },
        'in progress': { bg: '#e3f2fd', text: '#1976d2' }
    };

    const style = colors[status.toLowerCase()] || colors['draft'];
    statusBadge.style.backgroundColor = style.bg;
    statusBadge.style.color = style.text;
    statusBadge.style.padding = "4px 12px";
    statusBadge.style.borderRadius = "20px";
    statusBadge.style.fontSize = "12px";
    statusBadge.style.fontWeight = "bold";
}

function updateTimeline(status) {
    const stages = ["Awaiting Approval", "Confirmed", "Prepare", "QC Checked", "Shipping", "Completed"];
    const currentIndex = stages.indexOf(status);

    const steps = document.querySelectorAll('.step');
    const lines = document.querySelectorAll('.line');

    steps.forEach((step, index) => {
        step.classList.remove('completed', 'current', 'upcoming');

        if (currentIndex === 0) {
            if (index === 0) {
                step.classList.add('completed');
            } else if (index === 1) {
                step.classList.add('current');
            } else {
                step.classList.add('upcoming');
            }
        } else {
            if (index <= currentIndex) {
                step.classList.add('completed');
            } else if (index === currentIndex + 1) {
                step.classList.add('current');
            } else {
                step.classList.add('upcoming');
            }
        }
    });

    lines.forEach((line, index) => {
        line.classList.remove('active');
        if (index <= currentIndex) {
            line.classList.add('active');
        }
    });
}

function renderTaskPanel(order) {
    const taskPanel = document.querySelector('.task-panel');
    if (!taskPanel) return;

    const status = mapStatus(order.status);
    let content = "";

    if (status === "Awaiting Approval") {
        content = `
            <h2><i class="fas fa-hourglass-half"></i> Order Status</h2>
            <div class="task-info">
                <p class="task-label">CURRENT STEP</p>
                <h3 style="color: #f9a825;">Awaiting Admin Approval</h3>
                <p>This order has been submitted successfully. Please wait for the Admin to verify and confirm the requirements.</p>
            </div>
            <div style="padding: 12px; background: #fff9c4; border-radius: 8px; color: #856404; font-size: 13px; text-align: center; border: 1px solid #ffe082;">
                <i class="fas fa-user-lock"></i> Verification is required to move to production.
            </div>
        `;
    } else if (status === "Confirmed") {
        content = `
            <h2><i class="fas fa-box-open"></i> Warehouse Process</h2>
            <div class="task-info">
                <p class="task-label">CURRENT STEP</p>
                <h3 style="color: #2d7a5d;">Order Confirmed</h3>
                <p>Assigned: <strong>Manufacturer / Warehouse</strong></p>
                <p>The warehouse team has received the request and is preparing the products.</p>
            </div>
        `;
    } else if (status === "Rejected") {
        content = `
            <h2><i class="fas fa-times-circle"></i> Order Rejected</h2>
            <div class="task-info">
                <p class="task-label">CURRENT STEP</p>
                <h3 style="color: #c62828;">Order Was Rejected</h3>
                <p>This order has been rejected by the Admin. Please review and resubmit if needed.</p>
            </div>
        `;
    } else {
        content = `
            <h2><i class="fas fa-tasks"></i> Technical Task</h2>
            <div class="task-info">
                <p class="task-label">CURRENT STEP</p>
                <h3>${status} Stage</h3>
                <p>The order is being processed by the sale department.</p>
            </div>
        `;
    }
    taskPanel.innerHTML = content;
}

function toggleHold() {
    const holdIcon = document.querySelector('#holdResumeBtn i');
    const holdText = document.getElementById('holdBtnText');
    if (!holdIcon || !holdText) return;

    const isPaused = holdIcon.classList.contains('fa-play-circle');
    if (!isPaused) {
        holdIcon.className = 'fas fa-play-circle';
        holdText.innerText = "Resume";
    } else {
        holdIcon.className = 'fas fa-pause-circle';
        holdText.innerText = "Hold";
    }
}