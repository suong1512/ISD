document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('.login-btn');
    const errorEl = document.getElementById('loginError');

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    if (errorEl) errorEl.style.display = 'none';

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const rawText = await res.text();
        console.log('Raw response:', rawText);
        
        let data = {};
        try {
            data = JSON.parse(rawText);
        } catch (jsonErr) {
            console.error('JSON parsing failed:', jsonErr);
            throw new Error(`Server returned invalid JSON: ${rawText.substring(0, 50)}...`);
        }

        if (!res.ok) {
            throw new Error(data.message || 'Login failed');
        }

        const user = data.data;

        // Check role - this login page is for Admin
        if (user.role !== 'ADMIN') {
            throw new Error('Access denied. This login is for Administrators only.');
        }

        // Store user data
        localStorage.setItem('authUser', JSON.stringify(user));
        localStorage.setItem('currentUser', user.full_name);

        const initials = user.full_name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
        localStorage.setItem('userInitials', initials);

        console.log('Login success!', user);
        window.location.href = '../A_dashboard/A_dash.html';

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