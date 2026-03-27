document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    console.log("Login clicked! Redirecting...");

    window.location.href = '../AC_dashboard/AC_dash.html';
});