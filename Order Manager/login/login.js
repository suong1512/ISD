document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const usernameValue = document.getElementById('username').value;

    // Hàm xử lý lấy chữ cái đầu (Ví dụ: "John Dash" -> "JD")
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2) // Lấy tối đa 2 chữ cái đầu
            .join('');
    };

    const initials = getInitials(usernameValue);

    // Lưu cả tên đầy đủ và chữ cái đầu vào máy người dùng
    localStorage.setItem('currentUser', usernameValue);
    localStorage.setItem('userInitials', initials);

    console.log("Login success! Initials:", initials);
    window.location.href = '../S_dashboard/S_dash.html';
});