/**
 * Auth Guard - Include this script on any protected page.
 * It checks if the user is logged in and has the correct role.
 * 
 * Usage: <script src="../auth.js"></script>
 * Then call: requireAuth('SALES_STAFF') or requireAuth('ADMIN') etc.
 */

function getCurrentUser() {
    const userData = localStorage.getItem('authUser');
    if (!userData) return null;
    try {
        return JSON.parse(userData);
    } catch (e) {
        localStorage.removeItem('authUser');
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
            alert('You do not have permission to access this page.');
            window.location.href = getGatePath();
            return false;
        }
    }

    return true;
}

function logout() {
    localStorage.removeItem('authUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userInitials');
    window.location.href = getGatePath();
}

function getGatePath() {
    // Try to find the gate page relative to current location
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    // Default fallback
    return '../gate/gate.html';
}
