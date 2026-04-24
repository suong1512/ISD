document.addEventListener('DOMContentLoaded', async function () {
    // Avatar Dropdown Toggle
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    if (avatar && dropdown) {
        avatar.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', function (e) {
            if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // Global Quick Actions Mappings

    const invoiceBtn = document.querySelector('.invoice-btn');
    if (invoiceBtn) {
        invoiceBtn.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('authUser') || '{}');
            if (user.role === 'ADMIN') {
                window.location.href = '../A_invoice_view/A_invoice_view.html';
            } else if (user.role === 'ACCOUNTANT') {
                window.location.href = '../AC_invoice_create/invoice.html';
            } else {
                alert('Access denied: Only Admin and Accountant can view invoices.');
            }
        });
    }

    // 1. Lấy ID từ sessionStorage
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        alert("Không tìm thấy mã đơn hàng!");
        window.location.href = '../list/O_list.html';
        return;
    }

    // Initialize User Info
    const initials = localStorage.getItem('userInitials');
    const fullName = localStorage.getItem('currentUser');
    const authUser = JSON.parse(localStorage.getItem('authUser')) || {};

    // 2. Lấy chi tiết đơn hàng từ API
    let currentOrder;
    try {
        const response = await apiGet(`/orders/${orderId}`);
        currentOrder = response.data;
    } catch (error) {
        console.error('Failed to load order:', error);
        showCustomAlert("Failed to load order: " + error.message);
        window.location.href = '../list/O_list.html';
        return;
    }

    if (!currentOrder) {
        alert("Order data not found!");
        window.location.href = '../list/O_list.html';
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
    const phoneEl = document.getElementById('detPhone');
    if (phoneEl) phoneEl.innerText = currentOrder.phone || "N/A";

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

            // If file_type is CUSTOMER, it's from creation.
            const isInitialFile = att.file_type === 'CUSTOMER';
            const isSupplierFile = !isInitialFile;
            const downloadUrl = att.file_path; // Already starts with /uploads/

            // All roles can delete supplementary files
            const canManageFiles = true;
            const deleteBtn = (isSupplierFile && canManageFiles) ?
                `<button onclick="deleteAttachment(${currentOrder.id}, ${att.id})" title="Delete File" style="background:none; border:none; color:#d32f2f; cursor:pointer; padding:5px;"><i class="fas fa-trash"></i></button>` :
                `<span style="font-size: 10px; color: #888; padding: 5px;"><i class="fas fa-lock" title="Creation file (Locked)"></i></span>`;

            return `
                <div style="display: flex; align-items: stretch; gap: 5px; margin-bottom: 8px;">
                    <a href="${downloadUrl}" download="${att.file_name}" class="file-item" target="_blank"
                    style="flex: 1; margin-bottom: 0px; text-decoration: none; color: inherit; ${isSupplierFile ? 'border-left: 4px solid #2d7a5d; background: #f0f9f6;' : ''}">
                        <div style="display: flex; flex-direction: column;">
                            <div style="font-weight: 500; word-break: break-all;">
                                <i class="fas ${icon}" style="margin-right: 8px; ${isSupplierFile ? 'color: #2d7a5d;' : ''}"></i> 
                                ${att.file_name}
                            </div>
                            ${att.uploaded_by_name ? `<div style="color:#888; font-size:11px; margin-top:4px;"><i class="fas fa-user-edit"></i> by ${att.uploaded_by_name}</div>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${isSupplierFile ? '<span style="font-size: 9px; color: #2d7a5d; font-weight: bold;">ADDED</span>' : ''}
                            <i class="fas fa-download"></i>
                        </div>
                    </a>
                    <div style="display: flex; align-items: center; justify-content: center; width: 30px;">
                        ${deleteBtn}
                    </div>
                </div>
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
    renderOrderTimeline(currentOrder);
    renderNotes(currentOrder.notes);

    // Xử lý nút Add Note
    const addNoteBtn = document.querySelector('.btn-add-note');
    const noteInput = document.getElementById('newNoteInput');
    if (addNoteBtn && noteInput) {
        addNoteBtn.addEventListener('click', async () => {
            const noteText = noteInput.value.trim();
            if (!noteText) return;

            addNoteBtn.disabled = true;
            addNoteBtn.innerText = 'Adding...';

            try {
                const response = await apiPost(`/orders/${orderId}/notes`, {
                    note: noteText,
                    authorName: fullName,
                    authorRole: authUser.role
                });

                if (response.data.success) {
                    noteInput.value = '';
                    renderNotes(response.data.notes);
                }
            } catch (e) {
                showCustomAlert('Failed to add note: ' + e.message);
            } finally {
                addNoteBtn.disabled = false;
                addNoteBtn.innerText = 'Add Note';
            }
        });
    }

    // Avatar / User info and Role-based UI adaptation
    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.querySelector('.dropdown-header strong');

    if (initials && avatarElement) {
        avatarElement.innerText = initials;
    }
    if (fullName && dropdownName) {
        dropdownName.innerText = fullName;
    }

    // Role-based Nav rewriting
    if (authUser.role === 'TECH_STAFF') {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="../T_tasks/T_dash.html" style="text-decoration: none; color: inherit;">Tech Task</a></li>
                <li><a href="../T_checking/checking.html" style="text-decoration: none; color: inherit;">Checking</a></li>
                <li><a href="../T_shipping/shipping.html" style="text-decoration: none; color: inherit;">Shipping</a></li>
            `;
        }

        const breadcrumbContent = document.querySelector('.breadcrumb-content');
        if (breadcrumbContent) {
            breadcrumbContent.innerHTML = `
                <a href="../T_tasks/T_dash.html" class="back-link"></i> Tech Task</a>
                 > Order Details
            `;
        }

        const deptSpan = document.querySelector('.dropdown-header span');
        if (deptSpan) deptSpan.innerText = 'Technical Department';

    } else if (authUser.role === 'ACCOUNTANT') {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="../AC_tasks/AC_dash.html" style="text-decoration: none; color: inherit;">Accountant Task</a></li>
                <li><a href="../AC_invoice_conf/AC_confirm.html" style="text-decoration: none; color: inherit;">Confirm Invoice</a></li>
            `;
        }

        const breadcrumbContent = document.querySelector('.breadcrumb-content');
        if (breadcrumbContent) {
            breadcrumbContent.innerHTML = `
                <a href="../AC_tasks/AC_dash.html" class="back-link"></i> Accountant Task</a>
                 > Order Details
            `;
        }

        const deptSpan = document.querySelector('.dropdown-header span');
        if (deptSpan) deptSpan.innerText = 'Accounting Department';

    } else if (authUser.role === 'ADMIN') {
        const navLinks = document.querySelector('.nav-links');
        // Admin uses a completely different set of navigation links based on A_dash, but let's sync to basic standard
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="../A_dashboard/A_dash.html" style="text-decoration: none; color: inherit;">Dashboard</a></li>
                <li><a href="../list/O_list.html" style="text-decoration: none; color: inherit;">Order List</a></li>
                <li><a href="../A_order_conf/A_confirm.html" style="text-decoration: none; color: inherit;">Confirm Order</a></li>
            `;
        }

        const breadcrumbContent = document.querySelector('.breadcrumb-content');
        if (breadcrumbContent) {
            breadcrumbContent.innerHTML = `
                <a href="../list/O_list.html" class="back-link"></i> Order List</a>
                 > Order Details
            `;
        }

        const deptSpan = document.querySelector('.dropdown-header span');
        if (deptSpan) deptSpan.innerText = 'Administrator';
    } else {
        // SALES_STAFF defaults (already set in HTML mostly, but ensure 'active' states)
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="../S_tasks/S_dash.html" style="text-decoration: none; color: inherit;">Sale Task</a></li>
                <li><a href="../S_create_order/index.html" style="text-decoration: none; color: inherit;">Create Order</a></li>
                <li><a href="../S_preparing/preparing.html" style="text-decoration: none; color: inherit;">Preparing</a></li>
            `;
        }

        const breadcrumbContent = document.querySelector('.breadcrumb-content');
        if (breadcrumbContent) {
            breadcrumbContent.innerHTML = `
                <a href="../S_tasks/S_dash.html" class="back-link"></i> Sale Task</a>
                 > Order Details
            `;
        }
        const deptSpan = document.querySelector('.dropdown-header span');
        if (deptSpan) deptSpan.innerText = 'Sales Department';
    }

    // 8. Control Upload Permissions (Sales, Tech, Accountant, Admin)
    const supplierUploadSection = document.getElementById('supplierUploadSection');
    if (supplierUploadSection) {
        const canUpload = ['ADMIN', 'SALES_STAFF', 'TECH_STAFF', 'ACCOUNTANT'].includes(authUser.role);
        if (!canUpload) {
            supplierUploadSection.style.display = 'none';
        }
    }

    // Role-based and Status-based visibility for Invoice button
    const invBtn = document.querySelector('.invoice-btn');
    if (invBtn) {
        const canViewRole = (authUser.role === 'ADMIN' || authUser.role === 'ACCOUNTANT');
        const isValidStatus = (currentOrder.status === 'AWAITING_INVOICE' || currentOrder.status === 'COMPLETED');
        
        if (!canViewRole || !isValidStatus) {
            invBtn.style.display = 'none';
        }
    }

    // 7. Upload file từ trang Detail
    document.getElementById('supplierFileInput').addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const btn = document.querySelector('.btn-upload-trigger');
        let originalHtml = '';
        if (btn) {
            btn.disabled = true;
            originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }

        document.getElementById('fileNameDisplay').innerText = file.name;

        // Duplicate Check
        const isDuplicate = currentOrder.attachments && currentOrder.attachments.some(att => att.file_name === file.name);
        if (isDuplicate) {
            showCustomAlert(`A file named "${file.name}" already exists for Order #${currentOrder.order_code}. Please rename the file or delete the existing one first.`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
            return;
        }

        try {
            await apiUploadFile(`/orders/${orderId}/attachments`, file, 'SUPPLIER');
            showCustomAlert(`Uploaded: ${file.name} to Order #${currentOrder.order_code}`);
            window.pendingReload = true;
        } catch (error) {
            console.error('Upload failed:', error);
            showCustomAlert("Upload failed: " + error.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        }
    });
});



/**
 * Hàm hiển thị Badge trạng thái
 */
function renderStatusBadge(status) {
    const statusBadge = document.querySelector('.order-info-block .badge');
    if (!statusBadge) return;

    const safeStatus = status || 'UNKNOWN';
    statusBadge.innerText = safeStatus.toUpperCase();
    statusBadge.className = "badge"; // Reset classes

    const s = safeStatus.toLowerCase();
    let variant = "badge-neutral";
    if (s.includes("awaiting approval")) variant = "badge-urgent";
    else if (s.includes("qc checked")) variant = "badge-purple";
    else if (s.includes("awaiting invoice")) variant = "badge-lime";
    else if (s.includes("rejected")) variant = "badge-danger";
    else if (s.includes("confirmed") || s.includes("completed")) variant = "badge-success";
    else if (s.includes("prepared") || s.includes("prepare")) variant = "badge-info";
    else if (s.includes("shipping")) variant = "badge-orange";
    else if (s.includes("overdue")) variant = "badge-danger";

    statusBadge.classList.add(variant);
    statusBadge.removeAttribute('style');
}

function updateTimeline(status) {
    // HTML Steps: [Create(0), Approval(1), Prepare(2), QC(3), Shipping(4), Done(5)]
    // Backend status stages in order:
    //   Draft -> Awaiting Approval -> Confirmed -> Prepared -> QC -> Shipping/QC Checked -> Awaiting Invoice -> Completed

    let htmlStepIndex = 0;

    switch (status) {
        case 'Draft':
            htmlStepIndex = 0; // Create active
            break;
        case 'Awaiting Approval':
            htmlStepIndex = 1; // Approval active
            break;
        case 'Rejected':
            htmlStepIndex = 1; // Stayed at Approval, blocked
            break;
        case 'Confirmed':
            htmlStepIndex = 2; // Prepare active
            break;
        case 'Prepared':
            htmlStepIndex = 3; // QC active (Prepare is done)
            break;
        case 'QC':
            htmlStepIndex = 3; // QC active (still in QC)
            break;
        case 'QC Checked':
            htmlStepIndex = 4; // Shipping active (QC is done)
            break;
        case 'Shipping':
            htmlStepIndex = 4; // Shipping active
            break;
        case 'Awaiting Invoice':
            htmlStepIndex = 5; // Done active (Waiting for invoice to finish the whole process)
            break;
        case 'Completed':
            htmlStepIndex = 6; // All steps completed
            break;
        default:
            htmlStepIndex = 0;
    }

    const steps = document.querySelectorAll('.step');
    const lines = document.querySelectorAll('.line');

    steps.forEach((step, index) => {
        step.classList.remove('completed', 'current', 'upcoming');
        if (index < htmlStepIndex) {
            step.classList.add('completed');
        } else if (index === htmlStepIndex) {
            step.classList.add('current');
        } else {
            step.classList.add('upcoming');
        }
    });

    lines.forEach((line, index) => {
        line.classList.remove('active');
        if (index < htmlStepIndex) {
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

window.deleteAttachment = async function (orderId, attachmentId) {
    const isConfirmed = await showCustomConfirm('Are you sure you want to delete this file?');
    if (!isConfirmed) return;
    try {
        await apiDelete(`/orders/${orderId}/attachments/${attachmentId}`);
        showCustomAlert('File deleted successfully');
        window.pendingReload = true;
    } catch (e) {
        showCustomAlert('Could not delete file: ' + e.message);
    }
}

window.deleteNote = async function (index) {
    const isConfirmed = await showCustomConfirm('Are you sure you want to delete this note?');
    if (!isConfirmed) return;
    try {
        const orderId = sessionStorage.getItem('currentOrderId');
        const response = await apiDelete(`/orders/${orderId}/notes/${index}`);
        if (response.data.success) {
            showCustomAlert('Note deleted successfully');
            window.pendingReload = true;
        }
    } catch (e) {
        showCustomAlert('Could not delete note: ' + e.message);
    }
};

function renderOrderTimeline(order) {
    const container = document.getElementById('orderTimeline');
    if (!container) return;

    function timeAgo(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h ago`;
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    // Build milestone list — show only completed milestones
    const allMilestones = [
        {
            orderIndex: 1,
            key: 'created_at',
            label: 'Order Created',
            desc: `by ${order.created_by_name || 'Sale Staff 01'}`,
            ring: 'ring-gray',
            alwaysShow: true
        },
        {
            orderIndex: 2,
            key: 'submitted_at',
            label: 'Submitted for Approval',
            desc: `by ${order.created_by_name || 'Sale Staff 01'}`,
            ring: 'ring-yellow',
            condition: ['AWAITING_APPROVAL','CONFIRMED','PREPARING','QC','SHIPPING','AWAITING_INVOICE','COMPLETED','REJECTED'].includes(order.status)
        },
        {
            orderIndex: 3,
            key: 'confirmed_at',
            label: 'Order Confirmed',
            desc: 'by Admin 01',
            ring: 'ring-blue',
            condition: ['CONFIRMED','PREPARING','QC','SHIPPING','AWAITING_INVOICE','COMPLETED'].includes(order.status)
        },
        {
            orderIndex: 4,
            key: 'prepare_completed_at',
            label: 'Preparation Complete',
            desc: 'by Tech Staff 01',
            ring: 'ring-blue',
            condition: ['QC','SHIPPING','AWAITING_INVOICE','COMPLETED'].includes(order.status)
        },
        {
            orderIndex: 5,
            key: 'qc_completed_at',
            label: 'QC Passed',
            desc: 'by Tech Staff 01',
            ring: 'ring-purple',
            condition: ['SHIPPING','AWAITING_INVOICE','COMPLETED'].includes(order.status)
        },
        {
            orderIndex: 6,
            key: 'shipping_completed_at',
            label: 'Dispatched for Shipping',
            desc: 'by Tech Staff 01',
            ring: 'ring-orange',
            condition: ['AWAITING_INVOICE','COMPLETED'].includes(order.status)
        },
        {
            orderIndex: 7,
            key: 'invoice_at',
            label: 'Invoice Created',
            desc: 'by Accountant Staff',
            ring: 'ring-blue',
            condition: !!order.invoice
        },
        {
            orderIndex: 8,
            key: 'delivered_at',
            label: 'Completed',
            desc: '',
            ring: 'ring-green',
            condition: order.status === 'COMPLETED'
        }
    ];

    const items = [];

    allMilestones.forEach(m => {
        if (m.alwaysShow) {
            items.push({ ...m, ts: order[m.key] });
            return;
        }

        // Special handling for derived or status-based milestones
        if (m.condition) {
            let timestamp = order[m.key];
            
            // Fallback rules for missing timestamps
            if (!timestamp) {
                if (m.key === 'submitted_at') timestamp = order.created_at;
                else if (m.key === 'invoice_at' && order.invoice) timestamp = order.invoice.created_at || order.updated_at;
                else if (order.status === 'COMPLETED' || order.status === 'REJECTED') timestamp = order.updated_at;
            }

            if (timestamp || m.condition) {
                items.push({ ...m, ts: timestamp });
            }
            return;
        }

        if (order[m.key]) {
            items.push({ ...m, ts: order[m.key] });
        }
    });

    // If order is rejected, add a Rejected entry
    if (order.status === 'REJECTED') {
        items.push({
            orderIndex: 99,
            label: 'Order Rejected',
            desc: 'by Admin',
            ring: 'ring-red',
            ts: order.updated_at
        });
    }

    // Sort by timestamp ascending, then by logical order
    items.sort((a, b) => {
        const timeA = a.ts ? new Date(a.ts).getTime() : null;
        const timeB = b.ts ? new Date(b.ts).getTime() : null;

        if (timeA && timeB && timeA !== timeB) {
            return timeA - timeB;
        }
        return (a.orderIndex || 0) - (b.orderIndex || 0);
    });

    if (items.length === 0) {
        container.innerHTML = `<li><div class="timeline-ring ring-gray"></div><div class="timeline-content"><div class="timeline-header"><strong>No history available</strong></div></div></li>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const timeStr = timeAgo(item.ts) || '';
        return `
            <li>
                <div class="timeline-ring ${item.ring || 'ring-gray'}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <strong>${item.label}</strong>
                        <span>${timeStr}</span>
                    </div>
                    <p>${item.desc || ''}</p>
                </div>
            </li>
        `;
    }).join('');
}

function renderNotes(rawNotes) {
    const list = document.getElementById('notesList');
    if (!list) return;

    if (!rawNotes || rawNotes.trim() === '') {
        list.innerHTML = '<p style="color: #999; font-size: 13px;">No internal notes yet.</p>';
        return;
    }

    const noteBlocks = rawNotes.split('\n\n').filter(b => b.trim() !== '');
    
    list.innerHTML = noteBlocks.map((block, index) => {
        const hasHeader = /\[.*?\] .*?\(.*?\):/.test(block);
        
        if (hasHeader) {
            // Parse header and text by splitting at the first newline
            const firstNewline = block.indexOf('\n');
            const header = firstNewline !== -1 ? block.substring(0, firstNewline) : block;
            const text = firstNewline !== -1 ? block.substring(firstNewline + 1) : "";
            
            return `
                <div class="note-item" style="background:#fff3cd; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 10px; font-size: 13px;">
                    <div style="font-weight: bold; color: #856404; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${header}</span>
                        <button onclick="deleteNote(${index})" style="background:none; border:none; color:#d32f2f; cursor:pointer; padding:2px;"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div style="color: #666; white-space: pre-wrap;">${text}</div>
                </div>
            `;
        } else {
            // Creation notes (no header)
            return `
                <div class="note-item readonly-note" style="background:#f9f9f9; padding: 10px; border-radius: 6px; border-left: 4px solid #888; margin-bottom: 10px; font-size: 13px;">
                    <div style="font-weight: bold; color: #555; margin-bottom: 5px;"><i class="fas fa-lock" style="font-size: 10px;"></i> Creation Notes (Read-only)</div>
                    <div style="color: #666; white-space: pre-wrap;">${block}</div>
                </div>
            `;
        }
    }).join('');
}
