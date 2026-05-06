const API_BASE_URL = '';

async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Request failed');
    }
    return res.json();
}

async function apiPost(endpoint, body) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Request failed');
    }
    return res.json();
}

async function apiPatch(endpoint, body) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Request failed');
    }
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Request failed');
    }
    return res.json();
}

async function apiUploadFile(endpoint, file, fileType = 'CUSTOMER') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    
    // Automatically attach uploaded_by from current user session
    const authUser = JSON.parse(sessionStorage.getItem('authUser') || 'null');
    if (authUser && authUser.id) {
        formData.append('uploaded_by', authUser.id);
    } else {
        // Fallback for cases where auth isn't fully established or missing (e.g. testing)
        formData.append('uploaded_by', 1);
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Upload failed');
    }
    return res.json();
}

// Status mapping: Backend ENUM -> Frontend display text
const STATUS_MAP = {
    'DRAFT': 'Draft',
    'AWAITING_APPROVAL': 'Awaiting Approval',
    'REJECTED': 'Rejected',
    'CONFIRMED': 'Confirmed',
    'PREPARING': 'Prepared',
    'QC': 'QC Checked',
    'SHIPPING': 'Shipping',
    'AWAITING_INVOICE': 'Awaiting Invoice',
    'COMPLETED': 'Completed',
    'OVERDUE': 'Overdue'
};

function mapStatus(backendStatus) {
    return STATUS_MAP[backendStatus] || backendStatus;
}

// --- GLOBAL NOTIFICATION & CONFIRMATION SYSTEM ---
function injectModalHTML() {
    if (document.getElementById('customAlert')) return;
    const modalHtml = `
    <div id="customAlert" class="modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: flex-start; justify-content: center; padding-top: 50px;">
        <div class="modal-content card" style="background: #fff; padding: 30px; border-radius: 12px; width: fit-content; min-width: 400px; max-width: 90vw; box-shadow: 0 10px 40px rgba(0,0,0,0.15); text-align: center; border-top: 5px solid #2d7a5d;">
            <div class="modal-icon" id="modalIcon" style="font-size: 40px; margin-bottom: 20px; color: #2d7a5d;"></div>
            <div class="modal-title" id="modalTitle" style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #333;">Notification</div>
            <div class="modal-body" id="alertMessage" style="font-size: 15px; line-height: 1.6; color: #666; margin-bottom: 25px; white-space: nowrap;"></div>
            
            <div class="modal-footer" id="alertFooter" style="display: flex; justify-content: center;">
                <button class="btn btn-primary" id="alertOkBtn" style="padding: 10px 30px; min-width: 100px;">OK</button>
            </div>
            
            <div class="modal-footer" id="confirmFooter" style="display: none; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" id="confirmCancelBtn" style="padding: 10px 25px; border: 1px solid #ddd; background: #f9f9f9; color: #666;">Cancel</button>
                <button class="btn btn-primary" id="confirmOkBtn" style="padding: 10px 25px; background: #2d7a5d; color: #fff;">Confirm</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.showCustomAlert = function (message, title = 'Notification', type = 'info') {
    injectModalHTML();
    const modal = document.getElementById('customAlert');
    const msgEl = document.getElementById('alertMessage');
    const titleEl = document.getElementById('modalTitle');
    const iconEl = document.getElementById('modalIcon');
    const alertFooter = document.getElementById('alertFooter');
    const confirmFooter = document.getElementById('confirmFooter');
    const okBtn = document.getElementById('alertOkBtn');

    titleEl.innerText = title;
    msgEl.innerText = message;
    
    // Set icon based on type
    if (type === 'success') {
        iconEl.innerHTML = '<i class="fas fa-check-circle"></i>';
        iconEl.style.color = '#2d7a5d';
    } else if (type === 'error') {
        iconEl.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        iconEl.style.color = '#e74c3c';
    } else {
        iconEl.innerHTML = '<i class="fas fa-info-circle"></i>';
        iconEl.style.color = '#3498db';
    }

    alertFooter.style.display = 'flex';
    confirmFooter.style.display = 'none';
    modal.style.display = 'flex';

    return new Promise((resolve) => {
        okBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
    });
};

window.showCustomConfirm = function (message, title = 'Confirm Action') {
    injectModalHTML();
    const modal = document.getElementById('customAlert');
    const msgEl = document.getElementById('alertMessage');
    const titleEl = document.getElementById('modalTitle');
    const iconEl = document.getElementById('modalIcon');
    const alertFooter = document.getElementById('alertFooter');
    const confirmFooter = document.getElementById('confirmFooter');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    titleEl.innerText = title;
    msgEl.innerText = message;
    iconEl.innerHTML = '<i class="fas fa-question-circle"></i>';
    iconEl.style.color = '#f39c12';

    alertFooter.style.display = 'none';
    confirmFooter.style.display = 'flex';
    modal.style.display = 'flex';

    return new Promise((resolve) => {
        okBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
};
