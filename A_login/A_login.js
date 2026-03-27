document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    console.log("Login clicked! Redirecting...");

    window.location.href = '../A_dashboard/A_dash.html';
});