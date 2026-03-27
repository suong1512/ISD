document.addEventListener('DOMContentLoaded', function() {
    // 1. Lấy ID từ sessionStorage
    const orderId = sessionStorage.getItem('currentOrderId');

    if (!orderId) {
        alert("Không tìm thấy mã đơn hàng!");
        window.location.href = '../List/O_list.html';
        return;
    }

    // 2. Lấy danh sách từ localStorage
    const orders = JSON.parse(localStorage.getItem('all_orders')) || [];
    
    // 3. Tìm đơn hàng (Làm sạch ID bằng Regex)
    const cleanTargetId = String(orderId).replace(/^#+/, '');
    const currentOrder = orders.find(o => String(o.id).replace(/^#+/, '') === cleanTargetId);

    if (currentOrder) {
        // 1. Đổ dữ liệu cơ bản vào HTML
        document.getElementById('orderId').innerText = "#" + cleanTargetId;
        document.getElementById('customerName').innerText = currentOrder.customer || "N/A";
        // 1. Thông tin khách hàng mở rộng
        document.getElementById('detCompany').innerText = currentOrder.company || "N/A";
        document.getElementById('detAddress').innerText = currentOrder.address || "No address";
        document.getElementById('detEmail').innerText = currentOrder.email || "N/A";

        // 2. Thông tin Logistics & Deadlines
        document.getElementById('detExpectedDate').innerText = currentOrder.expectedDate || "---";
        document.getElementById('detDeadlinePrepare').innerText = currentOrder.deadlinePrepare || "---";
        document.getElementById('detDeadlineQC').innerText = currentOrder.deadlineQC || "---";
        document.getElementById('detDeadlineShipping').innerText = currentOrder.deadlineShipping || "---";
        document.getElementById('detCreatedDate').innerText = currentOrder.created || "---";
    
        // --- CẬP NHẬT ĐỊA CHỈ (Đảm bảo ID 'detAddress' khớp với HTML của bạn) ---
        const addressElement = document.getElementById('detAddress');
        if (addressElement) {
            // Lấy từ currentOrder.address mà mình đã lưu âm thầm ở Create
            addressElement.innerText = currentOrder.address || "No address provided";
        }

        // --- 4. CẬP NHẬT DANH SÁCH SẢN PHẨM (Sửa để hiện đầy đủ tên) ---
        const productContainer = document.getElementById('productListContainer');
        if (currentOrder.products && currentOrder.products.length > 0) {
            productContainer.innerHTML = currentOrder.products.map(p => `
                <div class="product-card">
                    <h3> ${p.name || 'Unknown Product'} </h3>
                    <p>Qty: <strong>${p.qty || 0}</strong> Units</p>
                </div>
            `).join('');
        } else {
            productContainer.innerHTML = `<p style="color:#999; padding: 20px;">No products listed.</p>`;
        }

        // --- 5. CẬP NHẬT FILE ĐÍNH KÈM (Giữ nguyên) ---
        const fileContainer = document.getElementById('fileListContainer');
        if (currentOrder.files && currentOrder.files.length > 0) {
    
            // Tạo bản sao và sắp xếp: File có chữ "SUPPLIER:" sẽ đứng trước
            const sortedFiles = [...currentOrder.files].sort((a, b) => {
                const isASupplier = a.name.startsWith("SUPPLIER:");
                const isBSupplier = b.name.startsWith("SUPPLIER:");
                if (isASupplier && !isBSupplier) return -1; // a lên trước b
                if (!isASupplier && isBSupplier) return 1;  // b lên trước a
                return 0;
            });

            fileContainer.innerHTML = sortedFiles.map(file => {
                let icon = "fa-file-alt";
                const fileName = file.name.toLowerCase();
                if(fileName.endsWith('.pdf')) icon = "fa-file-pdf";
                if(fileName.match(/\.(xlsx|csv|xls)$/)) icon = "fa-file-excel";
                if(fileName.match(/\.(jpg|jpeg|png)$/)) icon = "fa-file-image";
    
            const isSupplierFile = file.name.startsWith("SUPPLIER:");
        
                return `
                    <a href="${file.data}" download="${file.name}" class="file-item" 
                    style="text-decoration: none; color: inherit; ${isSupplierFile ? 'border-left: 4px solid #2d7a5d; background: #f0f9f6;' : ''}">
                        <span>
                            <i class="fas ${icon}" style="margin-right: 8px; ${isSupplierFile ? 'color: #2d7a5d;' : ''}"></i> 
                            ${file.name}
                        </span>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${isSupplierFile ? '<span style="font-size: 9px; color: #2d7a5d; font-weight: bold;">NEW</span>' : ''}
                            <i class="fas fa-download"></i>
                        </div>
                    </a>
                `;
            }).join('');
        } else {
            fileContainer.innerHTML = `<p style="color:#999; font-size: 13px; padding: 10px;">No files attached.</p>`;
        }

        // --- 6. CẬP NHẬT TRẠNG THÁI VÀ TIMELINE (Giữ nguyên) ---
        const status = (currentOrder.status || "Draft");
        renderStatusBadge(status); 
        updateTimeline(status);    
        renderTaskPanel(currentOrder); 
    } else {
        alert("Order data not found!");
        window.location.href = '../List/O_list.html';
    }


    //avatar
    // 1. Lấy thông tin từ LocalStorage
    const initials = localStorage.getItem('userInitials');
    const fullName = localStorage.getItem('currentUser');
    const avatarElement = document.getElementById('avatarTrigger');
    const dropdownName = document.querySelector('.dropdown-header strong');

    // 2. Cập nhật vào giao diện nếu có dữ liệu
    if (initials && avatarElement) {
        avatarElement.innerText = initials;
    }
    
    // Cập nhật tên trong Menu Dropdown (phần Logout bạn vừa làm)
    if (fullName && dropdownName) {
        dropdownName.innerText = fullName;
    }
});




document.addEventListener('DOMContentLoaded', function() {
    const avatar = document.getElementById('avatarTrigger');
    const dropdown = document.getElementById('userDropdown');

    // Toggle menu khi bấm vào Avatar
    avatar.addEventListener('click', function(e) {
        e.stopPropagation(); // Ngăn sự kiện nổi bọt
        dropdown.classList.toggle('active');
    });

    // Đóng menu nếu bấm ra ngoài màn hình
    document.addEventListener('click', function(e) {
        if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});











/**
 * Hàm hiển thị Badge trạng thái (Draft, Confirmed, etc.)
 */
function renderStatusBadge(status) {
    const statusBadge = document.querySelector('.order-info-block .badge');
    if (!statusBadge) return;

    statusBadge.innerText = status.toUpperCase();
    
    // Định nghĩa bảng màu sắc
    const colors = {
        'draft': { bg: '#eeeeee', text: '#666666' },
        'confirmed': { bg: '#e8f5e9', text: '#2e7d32' },
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
    const stages = ["Awaiting Approval", "Confirmed", "Prepare", "QC", "Shipping", "Completed"];
    const currentIndex = stages.indexOf(status);

    const steps = document.querySelectorAll('.step');
    const lines = document.querySelectorAll('.line');

    steps.forEach((step, index) => {
        // Reset trạng thái
        step.classList.remove('completed', 'current', 'upcoming');

        if (currentIndex === 0) {
            if (index === 0) {
                step.classList.add('completed'); 
            } else if (index === 1) {
                step.classList.add('current'); 
            } else {
                step.classList.add('upcoming');
            }
        } 
        else {
            if (index <= currentIndex) {
                step.classList.add('completed');
            } else if (index === currentIndex + 1) {
                step.classList.add('current');
            } else {
                step.classList.add('upcoming');
            }
        }
    });

    // 2. Cập nhật đường nối (Lines)
    lines.forEach((line, index) => {
        line.classList.remove('active');
        // Ở trạng thái Awaiting Approval (index 0), line đầu tiên phải xanh lá
        if (index <= currentIndex) {
            line.classList.add('active');
        }
    });
}

function renderTaskPanel(order) {
    const taskPanel = document.querySelector('.task-panel');
    if (!taskPanel) return;

    const status = order.status || "Draft";
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
    if(!holdIcon || !holdText) return;

    const isPaused = holdIcon.classList.contains('fa-play-circle');
    if (!isPaused) {
        holdIcon.className = 'fas fa-play-circle';
        holdText.innerText = "Resume";
    } else {
        holdIcon.className = 'fas fa-pause-circle';
        holdText.innerText = "Hold";
    }
}



document.getElementById('supplierFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileNameDisplay').innerText = file.name;

    const reader = new FileReader();
    reader.onload = function(event) {
        const fileData = {
            name: "ADD FILE: " + file.name, 
            data: event.target.result,
            date: new Date().toLocaleDateString()
        };

        saveFileToOrder(fileData);
    };
    reader.readAsDataURL(file);
});

function saveFileToOrder(newFile) {
    const orderId = sessionStorage.getItem('currentOrderId');
    let orders = JSON.parse(localStorage.getItem('all_orders')) || [];
    const cleanTargetId = String(orderId).replace(/^#+/, '');
    
    // Tìm vị trí đơn hàng trong mảng tổng
    const orderIndex = orders.findIndex(o => String(o.id).replace(/^#+/, '') === cleanTargetId);
    
    if (orderIndex !== -1) {
        if (!orders[orderIndex].files) {
            orders[orderIndex].files = [];
        }
        
        const isDuplicate = orders[orderIndex].files.some(f => f.name === newFile.name);
        
        if (!isDuplicate) {
            orders[orderIndex].files.push(newFile);
            
            // Lưu lại toàn bộ danh sách orders mới vào LocalStorage
            localStorage.setItem('all_orders', JSON.stringify(orders));
            alert(`Uploaded: ${newFile.name.replace("ADD FILE: ", "")}`);
            location.reload(); 
        } else {
            alert("This file already exists in the system!");
        }
    } else {
        alert("No order data found to save to the file!");
    }
}