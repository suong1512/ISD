/**
 * Accountant Confirm Invoice JS
 * Uses Shared Confirmation Module
 */

document.addEventListener('DOMContentLoaded', () => {
    initConfirmationPage({
        filterStatus: 'AWAITING_INVOICE',
        confirmEndpoint: (id) => `/orders/${id}/complete`,
        confirmButtonText: 'Confirm & Complete',
        confirmSuccessMsg: (code) => `Order ${code} has been successfully completed!`,
        pageTitle: 'Invoice Confirmation',
        cardClickUrl: '../AC_invoice_create/invoice.html'
    });
});
