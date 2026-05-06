document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'PREPARING',
        confirmEndpoint: (id) => `/orders/${id}/prepare`,
        confirmButtonText: 'Confirm Prepared',
        confirmSuccessMsg: (id) => `Success: Order #${id} is marked as Prepared and moved to QC!`
    });
});
