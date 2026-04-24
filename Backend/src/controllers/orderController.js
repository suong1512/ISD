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

async function prepareOrder(req, res) {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    const order = await orderService.prepareOrder(id, confirmed_by);

    return res.status(200).json({
      message: 'Order marked as Prepared successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in prepareOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('CONFIRMED')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function qcOrder(req, res) {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    const order = await orderService.qcOrder(id, confirmed_by);

    return res.status(200).json({
      message: 'Order passed QC successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in qcOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('PREPARING')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function shipOrder(req, res) {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    const order = await orderService.shipOrder(id, confirmed_by);

    return res.status(200).json({
      message: 'Order shipped successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in shipOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('QC')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function completeOrder(req, res) {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    const order = await orderService.completeOrder(id, confirmed_by);

    return res.status(200).json({
      message: 'Order completed successfully',
      data: order
    });
  } catch (error) {
    console.error('Error in completeOrder:', error);

    if (error.message === 'Order not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes('AWAITING_INVOICE')) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function createInvoice(req, res) {
  try {
    const { id } = req.params;
    const { subtotal, tax, total, created_by } = req.body;

    if (!created_by) {
      return res.status(400).json({ message: 'created_by is required' });
    }

    const result = await orderService.createInvoice(id, { subtotal, tax, total, created_by });

    return res.status(201).json({
      message: 'Invoice created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error'
    });
  }
}

async function getDashboardStats(req, res) {
  try {
    const stats = await orderService.getDashboardStats();

    return res.status(200).json({
      message: 'Dashboard stats fetched successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}


async function addNote(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    if (!note || note.trim() === '') {
      return res.status(400).json({ message: 'Note content is required' });
    }

    // Default to 'System' if not provided (though frontend should send author info)
    const authorName = req.body.authorName || 'User';
    const authorRole = req.body.authorRole || 'Staff';

    const result = await orderService.addNote(id, note.trim(), authorName, authorRole);

    return res.status(200).json({
      message: 'Note added successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in addNote:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
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
  submitDraftOrder,
  prepareOrder,
  qcOrder,
  shipOrder,
  completeOrder,
  createInvoice,
  getDashboardStats,
  addNote
};