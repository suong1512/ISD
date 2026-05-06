/**
 * Auth Guard - Include this script on any protected page.
 * It checks if the user is logged in and has the correct role.
 * 
 * Usage: <script src="../auth.js"></script>
 * Then call: requireAuth('SALES_STAFF') or requireAuth('ADMIN') etc.
 */

function getCurrentUser() {
    const userData = sessionStorage.getItem('authUser');
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch (e) {
        sessionStorage.removeItem('authUser');
        return null;
    }
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function requireAuth(allowedRoles) {
    const user = getCurrentUser();

    if (!user) {
        // Not logged in → redirect to gate
        window.location.href = getGatePath();
        return false;
    }

    // If specific roles are required, check them
    if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!roles.includes(user.role)) {
            showCustomAlert('Access denied. Redirecting to your dashboard.', 'Permission Denied', 'error').then(() => {
                window.location.href = getDashboardPath(user.role);
            });
            return false;
        }
    }

    return true;
}

function logout() {
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userInitials');
    window.location.href = getGatePath();
}

function getDashboardPath(role) {
    switch (role) {
        case 'ADMIN': return '../A_dashboard/A_dash.html';
        case 'TECH_STAFF': return '../T_tasks/T_dash.html';
        case 'ACCOUNTANT': return '../AC_tasks/AC_dash.html';
        case 'SALES_STAFF': return '../S_tasks/S_dash.html';
        default: return '../gate/gate.html';
    }
}

function getGatePath() {
    return '../gate/gate.html';
}
