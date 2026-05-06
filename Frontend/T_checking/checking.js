document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'QC',
        confirmEndpoint: (id) => `/orders/${id}/qc`,
        confirmButtonText: 'Confirm QC Checked',
        confirmSuccessMsg: (id) => `Success: Order #${id} is marked as QC Passed and moved to Shipping!`
    });
});
