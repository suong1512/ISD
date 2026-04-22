// ========== BIẾN TOÀN CỤC ==========
let productsCache = []; // Cache danh sách sản phẩm từ API

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const orderForm = document.getElementById('orderForm');

    // --- 0. LOAD PRODUCTS TỪ API ---
    await loadProducts();

    // --- 1. HÀM GÁN SỰ KIỆN XÓA ---
    function attachDeleteEvent(row) {
        const removeBtn = row.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.onclick = function () {
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

    // --- 4. HÀM LẤY DỮ LIỆU TỪ FORM ---
    function getOrderData() {
        const items = [];
        document.querySelectorAll('.product-item').forEach(item => {
            const sel = item.querySelector('.prodName');
            const qty = item.querySelector('.prodQty');
            if (sel && sel.value) {
                items.push({
                    product_id: parseInt(sel.value),
                    quantity: parseInt(qty.value) || 1
                });
            }
        });

        return {
            order_title: document.getElementById('custName')?.value || "New Order",
            customer_name: document.getElementById('custName')?.value || "",
            phone: document.getElementById('custPhone')?.value || "",
            company_name: document.getElementById('compName')?.value || "",
            address: document.getElementById('custAddr')?.value || "",
            email: document.getElementById('custEmail')?.value || "",
            special_requirements: document.getElementById('specialReq')?.value || "",
            notes: document.getElementById('orderNotes')?.value || "",
            expected_delivery_date: document.getElementById('expectedDelivery')?.value || "",
            contract_reference: document.getElementById('contractRef')?.value || "",
            prepare_deadline: document.getElementById('deadlinePrepare')?.value || "",
            qc_deadline: document.getElementById('deadlineQC')?.value || "",
            shipping_deadline: document.getElementById('deadlineShipping')?.value || "",
            created_by: JSON.parse(localStorage.getItem('authUser'))?.id || 1, // Get real user ID from auth
            items: items
        };
    }

    // --- 5. HÀM LƯU / GỬI ĐƠN HÀNG QUA API ---
    async function saveOrder(isDraft) {
        const contractRefInput = document.getElementById('contractRef');
        const fileCustInput = document.getElementById('fileCustomer');
        const boxCustomer = document.getElementById('boxCustomer');

        // CHỈ KIỂM TRA RÀNG BUỘC KHI KHÔNG PHẢI LÀ DRAFT
        if (!isDraft) {
            if (!orderForm.checkValidity()) {
                orderForm.reportValidity();
                return;
            }

            let hasError = false;

            // 1. Validate Contract Reference
            if (!contractRefInput.value.trim()) {
                contractRefInput.style.borderColor = "#ff4d4f";
                hasError = true;
            } else {
                contractRefInput.style.borderColor = "#e0e0e0";
            }

            // 2. Validate Contract File
            const fileNameDisplay = document.getElementById('fileNameCustomer');
            const hasExistingFile = fileNameDisplay && fileNameDisplay.innerText.includes("Existing:");
            if (!hasExistingFile && (!fileCustInput.files || fileCustInput.files.length === 0)) {
                boxCustomer.style.borderColor = "#ff4d4f";
                boxCustomer.style.backgroundColor = "rgba(255, 77, 79, 0.05)";
                hasError = true;
            } else {
                boxCustomer.style.borderColor = "#e0e0e0";
                boxCustomer.style.backgroundColor = "";
            }

            // 3. Validate Phone (Starts with 0, exactly 10 digits)
            const phoneInput = document.getElementById('custPhone');
            const phoneVal = phoneInput.value.trim();
            const phoneRegex = /^0\d{9}$/;
            if (!phoneRegex.test(phoneVal)) {
                phoneInput.style.borderColor = "#ff4d4f";
                document.getElementById('phoneError').style.display = 'block';
                hasError = true;
            } else {
                phoneInput.style.borderColor = "#e0e0e0";
                document.getElementById('phoneError').style.display = 'none';
            }

            // 4. Validate Email (Must be @gmail.com)
            const emailInput = document.getElementById('custEmail');
            const emailVal = emailInput.value.trim().toLowerCase();
            if (!emailVal.endsWith('@gmail.com')) {
                emailInput.style.borderColor = "#ff4d4f";
                document.getElementById('emailError').style.display = 'block';
                hasError = true;
            } else {
                emailInput.style.borderColor = "#e0e0e0";
                document.getElementById('emailError').style.display = 'none';
            }

            if (hasError) {
                alert("Please correct the highlighted errors before submitting.");
                return;
            }
        }

        const orderData = getOrderData();

        try {
            let result;

            if (editId) {
                // --- EDIT MODE: Update existing draft order ---
                result = await apiPatch(`/orders/${editId}`, orderData);

                // Nếu muốn submit draft -> gọi thêm submit
                if (!isDraft) {
                    result = await apiPatch(`/orders/${editId}/submit`, {});
                }
            } else {
                // --- CREATE MODE ---
                if (isDraft) {
                    result = await apiPost('/orders/draft', orderData);
                } else {
                    result = await apiPost('/orders/submit', orderData);
                }
            }

            const orderId = result.data?.id || editId;

            // Upload file nếu có
            const fileCust = fileCustInput.files[0];
            if (fileCust && orderId) {
                try {
                    await apiUploadFile(`/orders/${orderId}/attachments`, fileCust, 'CUSTOMER');
                } catch (uploadErr) {
                    console.error('File upload failed:', uploadErr);
                    // Không block flow nếu upload lỗi
                }
            }

            alert(isDraft ? "Draft saved!" : "Order created!");
            
            const authUser = JSON.parse(localStorage.getItem('authUser')) || {};
            // Nếu là edit và là ADMIN -> về order list. Còn lại (Sale, hoặc create mới) -> về Sale Task
            if (editId && authUser.role === 'ADMIN') {
                window.location.href = "../list/O_list.html";
            } else {
                window.location.href = "../S_tasks/S_dash.html";
            }

        } catch (error) {
            console.error('Save order error:', error);
            alert("Error: " + error.message);
        }
    }

    // Gán sự kiện submit
    orderForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveOrder(false);
    });

    document.querySelector('.btn-draft')?.addEventListener('click', (e) => {
        e.preventDefault();
        saveOrder(true);
    });

    // Reset viền khi người dùng bắt đầu nhập lại
    document.getElementById('contractRef')?.addEventListener('input', function () {
        this.style.borderColor = "#e0e0e0";
    });
    document.getElementById('custPhone')?.addEventListener('input', function () {
        this.style.borderColor = "#e0e0e0";
        document.getElementById('phoneError').style.display = 'none';
    });
    document.getElementById('custEmail')?.addEventListener('input', function () {
        this.style.borderColor = "#e0e0e0";
        document.getElementById('emailError').style.display = 'none';
    });

    // --- 6. ĐỔ DỮ LIỆU KHI EDIT (Từ API) ---
    if (editId) {
        try {
            const response = await apiGet(`/orders/${editId}`);
            const data = response.data;
            if (data) {
                const fieldMap = {
                    'custName': 'customer_name',
                    'custPhone': 'phone',
                    'compName': 'company_name',
                    'custAddr': 'address',
                    'custEmail': 'email',
                    'specialReq': 'special_requirements',
                    'orderNotes': 'notes',
                    'expectedDelivery': 'expected_delivery_date',
                    'contractRef': 'contract_reference',
                    'deadlinePrepare': 'prepare_deadline',
                    'deadlineQC': 'qc_deadline',
                    'deadlineShipping': 'shipping_deadline'
                };
                for (let id in fieldMap) {
                    const el = document.getElementById(id);
                    if (el) el.value = data[fieldMap[id]] || "";
                }

                // Load products vào form
                if (data.items && data.items.length > 0) {
                    data.items.forEach((item, index) => {
                        let currentRow = (index === 0) ? document.querySelector('.product-item') : null;
                        if (!currentRow) {
                            addBtn.click();
                            const allRows = document.querySelectorAll('.product-item');
                            currentRow = allRows[allRows.length - 1];
                        }
                        const sel = currentRow.querySelector('.prodName');
                        if (sel) sel.value = item.product_id;
                        currentRow.querySelector('.prodQty').value = item.quantity;
                        attachDeleteEvent(currentRow);
                    });
                }

                // Hiển thị file đã upload nếu có
                if (data.attachments && data.attachments.length > 0) {
                    const fileNameDisplay = document.getElementById('fileNameCustomer');
                    if (fileNameDisplay) {
                        fileNameDisplay.innerText = "Existing: " + data.attachments[0].file_name;
                        fileNameDisplay.style.color = "#2d7a5d";
                    }
                }
            }
        } catch (error) {
            console.error('Load order for edit failed:', error);
            alert("Failed to load order data: " + error.message);
        }
    }

    // --- 7. LOGIC DEADLINE ---
    const dateExpected = document.getElementById('expectedDelivery');
    const datePrepare = document.getElementById('deadlinePrepare');
    const dateQC = document.getElementById('deadlineQC');
    const dateShipping = document.getElementById('deadlineShipping');
    const today = new Date().toISOString().split('T')[0];

    [dateExpected, datePrepare, dateQC, dateShipping].forEach(input => {
        if (input) input.setAttribute('min', today);
    });

    dateExpected?.addEventListener('change', function () {
        const maxDate = this.value;
        if (maxDate) {
            [datePrepare, dateQC, dateShipping].forEach(input => {
                input.setAttribute('max', maxDate);
                if (input.value && input.value > maxDate) {
                    input.value = maxDate;
                }
            });
        }
    });

    datePrepare?.addEventListener('change', function () {
        if (this.value) {
            dateQC.setAttribute('min', this.value);
        }
    });

    dateQC?.addEventListener('change', function () {
        if (this.value) {
            dateShipping.setAttribute('min', this.value);
        }
    });

    // --- 8. AVATAR / USER INFO ---
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
});

// --- LOAD PRODUCTS TỪ API ---
async function loadProducts() {
    try {
        const response = await apiGet('/products');
        productsCache = response.data || [];

        // Render options cho tất cả dropdowns hiện tại
        document.querySelectorAll('.prodName').forEach(select => {
            populateProductDropdown(select);
        });
    } catch (error) {
        console.error('Failed to load products:', error);
        alert('Failed to load product list. Please check if the backend is running.');
    }
}

function populateProductDropdown(selectElement) {
    // Giữ lại option đầu tiên (placeholder)
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">Select a product...</option>';

    productsCache.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        selectElement.appendChild(option);
    });

    // Khôi phục giá trị đã chọn
    if (currentValue) {
        selectElement.value = currentValue;
    }
}

// --- DROPDOWN AVATAR ---
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

