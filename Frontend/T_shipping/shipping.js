document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'SHIPPING',
        confirmEndpoint: (id) => `/orders/${id}/ship`,
        confirmButtonText: 'Confirm Shipped',
        confirmSuccessMsg: (id) => `Success: Order #${id} is now Awaiting Invoice!`
    });
});
