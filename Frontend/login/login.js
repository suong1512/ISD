document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetRole = urlParams.get('target') || 'SALES_STAFF'; // Default to Sales

    const deptTitle = document.getElementById('deptTitle');
    const deptIcon = document.getElementById('deptIcon');

    // Update UI based on Role
    switch(targetRole) {
        case 'ADMIN':
            if(deptTitle) deptTitle.innerText = "Administrator";
            if(deptIcon) deptIcon.className = "fas fa-user-cog";
            break;
        case 'TECH_STAFF':
            if(deptTitle) deptTitle.innerText = "Technical Department";
            if(deptIcon) deptIcon.className = "fas fa-tools";
            break;
        case 'ACCOUNTANT':
            if(deptTitle) deptTitle.innerText = "Accountant Department";
            if(deptIcon) deptIcon.className = "fas fa-warehouse";
            break;
        case 'SALES_STAFF':
        default:
            if(deptTitle) deptTitle.innerText = "Sale Department";
            if(deptIcon) deptIcon.className = "fas fa-handshake";
            break;
    }

    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.querySelector('.login-btn');
        const errorEl = document.getElementById('loginError');

        // Disable button during request
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            const user = data.data;

            // Strict Role Validation
            if (user.role !== targetRole) {
                // Determine user friendly role name based on actual user.role
                let friendlyRole = "Unknown";
                if(targetRole === 'ADMIN') friendlyRole = "Administrator";
                else if(targetRole === 'SALES_STAFF') friendlyRole = "Sales";
                else if(targetRole === 'TECH_STAFF') friendlyRole = "Technical";
                else if(targetRole === 'ACCOUNTANT') friendlyRole = "Accountant";
                
                throw new Error(`Access denied. Please log in with a ${friendlyRole} account.`);
            }

            // Store user data
            localStorage.setItem('authUser', JSON.stringify(user));
            localStorage.setItem('currentUser', user.full_name);

            // Generate initials
            const initials = user.full_name
                .split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .slice(0, 2)
                .join('');
            localStorage.setItem('userInitials', initials);

            console.log('Login success!', user);

            // Dynamic Pathing depending on Role
            if (user.role === 'ADMIN') {
                window.location.href = '../A_dashboard/A_dash.html';
            } else if (user.role === 'TECH_STAFF') {
                window.location.href = '../T_tasks/T_dash.html';
            } else if (user.role === 'ACCOUNTANT') {
                window.location.href = '../AC_tasks/AC_dash.html';
            } else {
                window.location.href = '../S_tasks/S_dash.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            if (errorEl) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            } else {
                alert(error.message);
            }
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
});
