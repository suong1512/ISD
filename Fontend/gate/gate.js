// Gate page - if user is already logged in, optionally redirect
// For now, gate always shows (users can re-select department)

// Clear any previous login state when visiting gate
// (acts as a soft logout when navigating back to gate)
// Uncomment below if you want gate to auto-clear sessions:
// localStorage.removeItem('authUser');
// localStorage.removeItem('currentUser');
// localStorage.removeItem('userInitials');