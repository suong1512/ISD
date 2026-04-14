document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'CONFIRMED',
        confirmEndpoint: (id) => `/orders/${id}/prepare`,
        confirmButtonText: 'Confirm Prepared',
        confirmSuccessMsg: (id) => `Success: Order #${id} is marked as Prepared!`
    });
});
