document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'PREPARING',
        confirmEndpoint: (id) => `/orders/${id}/qc`,
        confirmButtonText: 'Confirm QC Checked',
        confirmSuccessMsg: (id) => `Success: Order #${id} is marked as QC Checked!`
    });
});
