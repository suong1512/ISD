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
    const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
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
    <div id="customAlert" class="modal-overlay" style="display: none;">
        <div class="modal-content card">
            <div class="modal-body" id="alertMessage"></div>
            <div class="modal-footer" id="alertFooter">
                <button class="btn btn-primary" id="alertOkBtn">OK</button>
            </div>
            <div class="modal-footer" id="confirmFooter" style="display: none;">
                <button class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmOkBtn">Confirm</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

let modalResolver = null;

window.showCustomAlert = function (message) {
    injectModalHTML();
    const modal = document.getElementById('customAlert');
    const msgEl = document.getElementById('alertMessage');
    const alertFooter = document.getElementById('alertFooter');
    const confirmFooter = document.getElementById('confirmFooter');
    const okBtn = document.getElementById('alertOkBtn');

    msgEl.innerText = message;
    alertFooter.style.display = 'flex';
    confirmFooter.style.display = 'none';
    modal.style.display = 'flex';

    return new Promise((resolve) => {
        okBtn.onclick = () => {
            modal.style.display = 'none';
            if (window.pendingReload) location.reload();
            resolve(true);
        };
    });
};

window.showCustomConfirm = function (message) {
    injectModalHTML();
    const modal = document.getElementById('customAlert');
    const msgEl = document.getElementById('alertMessage');
    const alertFooter = document.getElementById('alertFooter');
    const confirmFooter = document.getElementById('confirmFooter');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    msgEl.innerText = message;
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
