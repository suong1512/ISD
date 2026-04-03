const orderService = require('../services/orderService');

async function getAllOrders(req, res) {
  try {
    const orders = await orderService.getAllOrders();

    return res.status(200).json({
      message: 'Get orders successfully',
      data: orders
    });
  } catch (error) {
    console.error('Error in getAllOrders:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      message: 'Get order detail successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in getOrderById:', error);

    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function createDraftOrder(req, res) {
  try {
    const {
      order_title,
      customer_name,
      phone,
      address,
      email,
      expected_delivery_date,
      prepare_deadline,
      qc_deadline,
      shipping_deadline,
      created_by,
      items
    } = req.body;

    if (!created_by) {
      return res.status(400).json({
        message: 'created_by is required'
      });
    }

    const order = await orderService.createDraftOrder(req.body);

    return res.status(201).json({
      message: 'Draft order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in createDraftOrder:', error);

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function submitOrder(req, res) {
  try {
    const {
      order_title,
      customer_name,
      phone,
      address,
      email,
      expected_delivery_date,
      prepare_deadline,
      qc_deadline,
      shipping_deadline,
      created_by,
      items
    } = req.body;

    if (
      !order_title ||
      !customer_name ||
      !phone ||
      !address ||
      !email ||
      !expected_delivery_date ||
      !prepare_deadline ||
      !qc_deadline ||
      !shipping_deadline ||
      !created_by ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    const order = await orderService.createSubmittedOrder(req.body);

    return res.status(201).json({
      message: 'Order submitted successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in submitOrder:', error);

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function confirmOrder(req, res) {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    if (!confirmed_by) {
      return res.status(400).json({
        message: 'confirmed_by is required'
      });
    }

    const order = await orderService.confirmOrder(id, confirmed_by);

    return res.status(200).json({
      message: 'Order confirmed successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in confirmOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({
        message: error.message
      });
    }

    if (error.message === 'Only orders in AWAITING_APPROVAL can be confirmed') {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function rejectOrder(req, res) {
  try {
    const { id } = req.params;

    const order = await orderService.rejectOrder(id);

    return res.status(200).json({
      message: 'Order rejected successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in rejectOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({
        message: error.message
      });
    }

    if (error.message === 'Only orders in AWAITING_APPROVAL can be rejected') {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function updateDraftOrder(req, res) {
  try {
    const { id } = req.params;

    const order = await orderService.updateDraftOrder(id, req.body);

    return res.status(200).json({
      message: 'Draft order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in updateDraftOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Only DRAFT orders can be updated') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function submitDraftOrder(req, res) {
  try {
    const { id } = req.params;

    const order = await orderService.submitDraftOrder(id);

    return res.status(200).json({
      message: 'Draft submitted successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in submitDraftOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Only DRAFT orders can be submitted') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createDraftOrder,
  submitOrder,
  confirmOrder,
  rejectOrder,
  updateDraftOrder,
  submitDraftOrder
};