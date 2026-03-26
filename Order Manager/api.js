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

async function apiUploadFile(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);
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
    'PENDING_APPROVAL': 'Awaiting Approval',
    'CONFIRMED': 'Confirmed',
    'REJECTED': 'Rejected',
    'PREPARING': 'Prepare',
    'QC': 'QC Checked',
    'SHIPPING': 'Shipping',
    'DELIVERED': 'Completed'
};

function mapStatus(backendStatus) {
    return STATUS_MAP[backendStatus] || backendStatus;
}
