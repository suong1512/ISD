document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Ngăn trang web tải lại

    // Ở đây chưa cần check đúng sai, chỉ cần nhấn là đi tiếp
    console.log("Login clicked! Redirecting...");

    // Chuyển hướng đến trang List của bạn
    // Hãy kiểm tra lại đường dẫn cho đúng với cấu trúc thư mục của bạn
    window.location.href = '../T_dashboard/T_dash.html';
});