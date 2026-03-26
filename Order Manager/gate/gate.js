const role = localStorage.getItem('userRole');
if (role === 'admin') {
    window.location.href = "Admin/Dashboard.html";
} else if (role === 'sale') {
    window.location.href = "login/login.html";
}