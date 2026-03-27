document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const orderForm = document.getElementById('orderForm');

    // --- 1. HÀM GÁN SỰ KIỆN XÓA ---
    function attachDeleteEvent(row) {
        const removeBtn = row.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.onclick = function() {
                const allRows = document.querySelectorAll('.product-item');
                if (allRows.length > 1) {
                    row.remove();
                } else {
                    alert("The order must contain at least one product!");
                }
            };
        }
    }

    // --- 2. XỬ LÝ UPLOAD FILE ---
    function setupFileUpload(inputId, textId, boxId) {
        const fileInput = document.getElementById(inputId);
        const fileNameDisplay = document.getElementById(textId);
        const uploadBox = document.getElementById(boxId);
        if (!fileInput || !uploadBox) return;

        uploadBox.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                fileNameDisplay.innerText = "Selected: " + this.files[0].name;
                fileNameDisplay.style.color = "#2d7a5d";
                // Xóa highlight đỏ khi đã chọn file
                uploadBox.style.borderColor = "#2d7a5d"; 
                uploadBox.style.backgroundColor = ""; 
            }
        });
    }
    setupFileUpload('fileCustomer', 'fileNameCustomer', 'boxCustomer');

    // --- 3. QUẢN LÝ DANH SÁCH SẢN PHẨM ---
    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            const firstItem = document.querySelector('.product-item');
            if (!firstItem) return;
            const newItem = firstItem.cloneNode(true);
            newItem.querySelector('select').value = "";
            newItem.querySelector('input').value = "1";
            const actionBtn = newItem.querySelector('.action-btn');
            actionBtn.innerHTML = `<button type="button" class="btn-remove" style="border:none; background:none; color:red; cursor:pointer; margin-left:10px;"><i class="fas fa-trash-alt"></i></button>`;
            document.getElementById('productList').appendChild(newItem);
            attachDeleteEvent(newItem);
        });
    }

    // --- 4. HÀM LẤY DỮ LIỆU ---
    function getOrderData(statusValue, stepValue) {
        const products = [];
        document.querySelectorAll('.product-item').forEach(item => {
            const sel = item.querySelector('.prodName');
            const qty = item.querySelector('.prodQty');
            if (sel && sel.value) {
                products.push({ 
                    name: sel.options[sel.selectedIndex].text, 
                    value: sel.value, 
                    qty: qty.value 
                });
            }
        });

        const finalDeadline = document.getElementById('deadlineShipping')?.value || "---";

        return {
            id: editId || ("ORD-" + Math.floor(1000 + Math.random() * 9000)),
            customer: document.getElementById('custName')?.value || "",
            phone: document.getElementById('custPhone')?.value || "",
            company: document.getElementById('compName')?.value || "",
            address: document.getElementById('custAddr')?.value || "",
            email: document.getElementById('custEmail')?.value || "",
            dept: "Sales", 
            priority: "Medium", 
            deadline: finalDeadline, 
            total: products.length + " Items", 
            specialReq: document.getElementById('specialReq')?.value || "",
            notes: document.getElementById('orderNotes')?.value || "",
            products: products,
            expectedDate: document.getElementById('expectedDelivery')?.value || "",
            contractRef: document.getElementById('contractRef')?.value || "",
            deadlinePrepare: document.getElementById('deadlinePrepare')?.value || "",
            deadlineQC: document.getElementById('deadlineQC')?.value || "",
            deadlineShipping: finalDeadline,
            status: statusValue,
            step: stepValue,
            created: new Date().toISOString().split('T')[0]
        };
    }

    // --- 5. HÀM LƯU CHUNG (ĐÃ THÊM LOGIC HIGHLIGHT) ---
    function saveOrder(status, step) {
        const contractRefInput = document.getElementById('contractRef');
        const fileCustInput = document.getElementById('fileCustomer');
        const boxCustomer = document.getElementById('boxCustomer');
        
        // CHỈ KIỂM TRA RÀNG BUỘC KHI KHÔNG PHẢI LÀ DRAFT
        if (status !== "Draft") {
            let hasError = false;

            // 1. Kiểm tra Contract Reference
            if (!contractRefInput.value.trim()) {
                contractRefInput.style.borderColor = "#ff4d4f";
                hasError = true;
            } else {
                contractRefInput.style.borderColor = "#e0e0e0";
            }

            // 2. Kiểm tra File (Chỉ bắt buộc nếu tạo mới)
            if (!editId && (!fileCustInput.files || fileCustInput.files.length === 0)) {
                boxCustomer.style.borderColor = "#ff4d4f";
                boxCustomer.style.backgroundColor = "rgba(255, 77, 79, 0.05)";
                hasError = true;
            }

            if (hasError) {
                alert("Please fill in the Contract Reference and upload the Contract file before submitting.");
                boxCustomer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return; // Ngừng lưu nếu là Submit mà thiếu info
            }
        }

        // --- NẾU LÀ DRAFT HOẶC SUBMIT ĐÃ ĐỦ INFO THÌ CHẠY TIẾP XUỐNG ĐÂY ---
        const newOrder = getOrderData(status, step);
        const fileCust = fileCustInput.files[0];
        newOrder.files = [];

        if (fileCust) {
            newOrder.files.push({ name: fileCust.name });
        }

        let orders = JSON.parse(localStorage.getItem('all_orders')) || [];

        if (editId) {
            const idx = orders.findIndex(o => String(o.id) === String(editId));
            if (idx !== -1) {
                // Giữ lại file cũ nếu edit không chọn file mới
                if (newOrder.files.length === 0 && orders[idx].files) {
                    newOrder.files = orders[idx].files;
                }
                orders[idx] = newOrder;
            }
        } else {
            orders.push(newOrder);
        }

        localStorage.setItem('all_orders', JSON.stringify(orders));
        alert(status === "Draft" ? "Draft saved!" : "Order created!");
        window.location.href = "../List/O_list.html";
    }

    // Gán sự kiện submit
    orderForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveOrder("Awaiting Approval", 1);
    });

    document.querySelector('.btn-draft')?.addEventListener('click', (e) => {
        e.preventDefault();
        saveOrder("Draft", 0);
    });

    // Reset viền khi người dùng bắt đầu nhập lại
    document.getElementById('contractRef')?.addEventListener('input', function() {
        this.style.borderColor = "#e0e0e0";
    });

    // --- 6. ĐỔ DỮ LIỆU KHI EDIT (Giữ nguyên) ---
    if (editId) {
        const data = (JSON.parse(localStorage.getItem('all_orders')) || []).find(o => String(o.id) === String(editId));
        if (data) {
            const fieldMap = {
                'custName': 'customer', 'custPhone': 'phone', 'compName': 'company',
                'custAddr': 'address', 'custEmail': 'email', 'specialReq': 'specialReq',
                'orderNotes': 'notes', 'expectedDelivery': 'expectedDate',
                'contractRef': 'contractRef', 'deadlinePrepare': 'deadlinePrepare',
                'deadlineQC': 'deadlineQC', 'deadlineShipping': 'deadlineShipping'
            };
            for (let id in fieldMap) {
                const el = document.getElementById(id);
                if (el) el.value = data[fieldMap[id]] || "";
            }
            if (data.products && data.products.length > 0) {
                data.products.forEach((p, index) => {
                    let currentRow = (index === 0) ? document.querySelector('.product-item') : null;
                    if (!currentRow) {
                        addBtn.click();
                        const allRows = document.querySelectorAll('.product-item');
                        currentRow = allRows[allRows.length - 1];
                    }
                    const sel = currentRow.querySelector('.prodName');
                    if (sel) sel.value = p.value || "";
                    currentRow.querySelector('.prodQty').value = p.qty;
                    attachDeleteEvent(currentRow);
                });
            }
        }
    }

    // --- 7. LOGIC DEADLINE (CẬP NHẬT MỚI) ---
    const dateExpected = document.getElementById('expectedDelivery');
    const datePrepare = document.getElementById('deadlinePrepare');
    const dateQC = document.getElementById('deadlineQC');
    const dateShipping = document.getElementById('deadlineShipping');
    const today = new Date().toISOString().split('T')[0];

    // Thiết lập ngày tối thiểu là hôm nay cho tất cả các ô date
    [dateExpected, datePrepare, dateQC, dateShipping].forEach(input => {
        if (input) input.setAttribute('min', today);
    });

    // Khi thay đổi Delivery Completion Deadline (Ngày cuối cùng)
    dateExpected?.addEventListener('change', function() {
        const maxDate = this.value;
        if (maxDate) {
            // 1. Ràng buộc các deadline con không được vượt quá ngày này
            [datePrepare, dateQC, dateShipping].forEach(input => {
                input.setAttribute('max', maxDate);
                
                // 2. Nếu ngày đã lỡ chọn trước đó lớn hơn maxDate mới, thì reset về maxDate
                if (input.value && input.value > maxDate) {
                    input.value = maxDate;
                }
            });
        }
    });

    // Ràng buộc logic thứ tự giữa các bước (Tùy chọn nhưng nên có)
    datePrepare?.addEventListener('change', function() {
        if (this.value) {
            dateQC.setAttribute('min', this.value); // QC phải sau hoặc bằng Prepare
        }
    });

    dateQC?.addEventListener('change', function() {
        if (this.value) {
            dateShipping.setAttribute('min', this.value); // Shipping phải sau hoặc bằng QC
        }
    });








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
