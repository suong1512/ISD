const pool = require('../config/db');

function formatDateOnly(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

function isPast(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const target = new Date(dateString);
  const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  return targetOnly < todayOnly;
}

async function generateOrderCode(connection) {
  let orderCode = '';
  let isUnique = false;

  while (!isUnique) {
    // 1. Tạo 4 số ngẫu nhiên (0000 - 9999)
    const random4Digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    // 2. Chỉ lấy tiền tố ORD- và 4 số này
    orderCode = `ORD-${random4Digits}`;

    // 3. Kiểm tra xem mã này đã tồn tại trong database chưa
    const [rows] = await connection.query(
      'SELECT id FROM orders WHERE order_code = ? LIMIT 1',
      [orderCode]
    );

    // Nếu không tìm thấy (rows rỗng) thì mã này dùng được
    if (rows.length === 0) {
      isUnique = true;
    }
  }

  return orderCode;
}

async function getAllOrders() {
  const [rows] = await pool.query(`
    SELECT
      o.id,
      o.order_code,
      o.order_title,
      o.customer_name,
      o.status,
      o.total_amount,
      o.expected_delivery_date,
      o.prepare_deadline,
      o.qc_deadline,
      o.shipping_deadline,
      o.prepare_completed_at,
      o.qc_completed_at,
      o.shipping_completed_at,
      o.delivered_at,
      o.created_at,
      COALESCE(ic.item_count, 0) AS item_count
    FROM orders o
    LEFT JOIN (
      SELECT order_id, COUNT(*) AS item_count
      FROM order_items
      GROUP BY order_id
    ) ic ON ic.order_id = o.id
    ORDER BY o.updated_at DESC
  `);

  const mappedOrders = rows.map((order) => {
    const isPrepareDelayed =
      !order.prepare_completed_at && isPast(order.prepare_deadline);

    const isQcDelayed =
      !order.qc_completed_at && isPast(order.qc_deadline);

    const isShippingDelayed =
      !order.shipping_completed_at && isPast(order.shipping_deadline);

    const isDeliveryDelayed =
      !order.delivered_at && isPast(order.expected_delivery_date);

    return {
      id: order.id,
      order_code: order.order_code,
      order_title: order.order_title,
      customer_name: order.customer_name,
      status: order.status,
      total_amount: Number(order.total_amount),
      item_count: Number(order.item_count),
      expected_delivery_date: formatDateOnly(order.expected_delivery_date),
      prepare_deadline: formatDateOnly(order.prepare_deadline),
      qc_deadline: formatDateOnly(order.qc_deadline),
      shipping_deadline: formatDateOnly(order.shipping_deadline),
      created_at: order.created_at,
      is_prepare_delayed: isPrepareDelayed,
      is_qc_delayed: isQcDelayed,
      is_shipping_delayed: isShippingDelayed,
      is_delivery_delayed: isDeliveryDelayed
    };
  });

  return mappedOrders;
}

async function getOrderById(orderId) {
  const [orderRows] = await pool.query(`
    SELECT
      o.id,
      o.order_code,
      o.order_title,
      o.customer_name,
      o.phone,
      o.company_name,
      o.address,
      o.email,
      o.notes,
      o.special_requirements,
      o.contract_reference,
      o.status,
      o.total_amount,
      o.expected_delivery_date,
      o.prepare_deadline,
      o.qc_deadline,
      o.shipping_deadline,
      o.prepare_completed_at,
      o.qc_completed_at,
      o.shipping_completed_at,
      o.delivered_at,
      o.created_at,
      o.updated_at,
      o.confirmed_at,
      u.full_name AS created_by_name,
      inv.invoice_code,
      inv.subtotal_amount,
      inv.tax_amount,
      inv.total_amount AS total_amount_inv,
      inv.created_at AS created_at_inv
    FROM orders o
    JOIN users u ON o.created_by = u.id
    LEFT JOIN invoices inv ON o.id = inv.order_id
    WHERE o.id = ?
  `, [orderId]);

  if (orderRows.length === 0) {
    return null;
  }

  const order = orderRows[0];

  const [itemRows] = await pool.query(`
    SELECT
      oi.id,
      oi.order_id,
      oi.product_id,
      p.name AS product_name,
      oi.quantity,
      oi.unit_price,
      oi.subtotal
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC
  `, [orderId]);

  const [attachmentRows] = await pool.query(`
    SELECT
      oa.id,
      oa.order_id,
      oa.file_name,
      oa.file_type,
      oa.file_path,
      oa.uploaded_at,
      u.full_name AS uploaded_by_name
    FROM order_attachments oa
    JOIN users u ON oa.uploaded_by = u.id
    WHERE oa.order_id = ?
    ORDER BY oa.id ASC
  `, [orderId]);

  const isPrepareDelayed =
    !order.prepare_completed_at && isPast(order.prepare_deadline);

  const isQcDelayed =
    !order.qc_completed_at && isPast(order.qc_deadline);

  const isShippingDelayed =
    !order.shipping_completed_at && isPast(order.shipping_deadline);

  const isDeliveryDelayed =
    !order.delivered_at && isPast(order.expected_delivery_date);

  return {
    id: order.id,
    order_code: order.order_code,
    order_title: order.order_title,
    customer_name: order.customer_name,
    phone: order.phone,
    company_name: order.company_name,
    address: order.address,
    email: order.email,
    notes: order.notes,
    special_requirements: order.special_requirements,
    contract_reference: order.contract_reference,
    status: order.status,
    total_amount: Number(order.total_amount),
    expected_delivery_date: formatDateOnly(order.expected_delivery_date),
    prepare_deadline: formatDateOnly(order.prepare_deadline),
    qc_deadline: formatDateOnly(order.qc_deadline),
    shipping_deadline: formatDateOnly(order.shipping_deadline),
    created_at: order.created_at,
    updated_at: order.updated_at,
    confirmed_at: order.confirmed_at,
    created_by_name: order.created_by_name,
    invoice: order.invoice_code ? {
      code: order.invoice_code,
      subtotal: Number(order.subtotal_amount),
      tax: Number(order.tax_amount),
      total: Number(order.total_amount_inv || order.total_amount),
      created_at: order.created_at_inv
    } : null,
    delay_flags: {
      prepare: isPrepareDelayed,
      qc: isQcDelayed,
      shipping: isShippingDelayed,
      delivery: isDeliveryDelayed
    },
    items: itemRows.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal)
    })),
    attachments: attachmentRows
  };
}

async function createDraftOrder(orderData) {
  const connection = await pool.getConnection();

  try {
    console.log('--- createDraftOrder START ---');
    console.log('orderData = ', orderData);

    await connection.beginTransaction();
    console.log('Transaction started');

    const {
      order_title,
      customer_name,
      phone,
      company_name,
      address,
      email,
      notes,
      special_requirements,
      expected_delivery_date,
      contract_reference,
      prepare_deadline,
      qc_deadline,
      shipping_deadline,
      created_by,
      items = []
    } = orderData;
    
    // Provide safe defaults for potentially missing fields in drafts
    const finalOrderTitle = order_title || "New Draft Order";
    const finalItems = [];
    let totalAmount = 0;

    for (const item of items) {
      console.log('Processing item = ', item);

      const [productRows] = await connection.query(
        `
        SELECT id, name, unit_price
        FROM products
        WHERE id = ?
        `,
        [item.product_id]
      );

      console.log('productRows = ', productRows);

      if (productRows.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }

      const product = productRows[0];
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.unit_price);
      const subtotal = quantity * unitPrice;

      finalItems.push({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        subtotal
      });

      totalAmount += subtotal;
    }

    console.log('finalItems = ', finalItems);
    console.log('totalAmount = ', totalAmount);

    const orderCode = await generateOrderCode(connection);
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (
        order_code,
        order_title,
        customer_name,
        phone,
        company_name,
        address,
        email,
        notes,
        special_requirements,
        expected_delivery_date,
        contract_reference,
        prepare_deadline,
        qc_deadline,
        shipping_deadline,
        status,
        total_amount,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        finalOrderTitle,
        customer_name || "",
        phone || "",
        company_name || "",
        address || "",
        email || "",
        notes || "",
        special_requirements || "",
        expected_delivery_date || null,
        contract_reference || "",
        prepare_deadline || null,
        qc_deadline || null,
        shipping_deadline || null,
        'DRAFT',
        totalAmount,
        created_by
      ]
    );

    const orderId = orderResult.insertId;
    console.log('Inserted orderId = ', orderId);

    for (const item of finalItems) {
      const [itemResult] = await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.subtotal
        ]
      );

      console.log('Inserted order_item id = ', itemResult.insertId);
    }

    await connection.commit();
    console.log('Transaction committed');

    const createdOrder = await getOrderById(orderId);
    console.log('createdOrder after commit = ', createdOrder);
    console.log('--- createDraftOrder END ---');

    return createdOrder;
  } catch (error) {
    console.error('createDraftOrder ERROR = ', error);
    await connection.rollback();
    console.log('Transaction rolled back');
    throw error;
  } finally {
    connection.release();
    console.log('Connection released');
  }
}

async function createSubmittedOrder(orderData) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      order_title,
      customer_name,
      phone,
      company_name,
      address,
      email,
      notes,
      special_requirements,
      expected_delivery_date,
      contract_reference,
      prepare_deadline,
      qc_deadline,
      shipping_deadline,
      created_by,
      items
    } = orderData;

    const orderCode = await generateOrderCode(connection);

    let totalAmount = 0;
    const finalItems = [];

    for (const item of items) {
      const [productRows] = await connection.query(
        `
        SELECT id, name, unit_price
        FROM products
        WHERE id = ?
        `,
        [item.product_id]
      );

      if (productRows.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }

      const product = productRows[0];
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.unit_price);
      const subtotal = quantity * unitPrice;

      finalItems.push({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        subtotal
      });

      totalAmount += subtotal;
    }

    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (
        order_code,
        order_title,
        customer_name,
        phone,
        company_name,
        address,
        email,
        notes,
        special_requirements,
        expected_delivery_date,
        contract_reference,
        prepare_deadline,
        qc_deadline,
        shipping_deadline,
        status,
        total_amount,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderCode,
        order_title,
        customer_name,
        phone,
        company_name,
        address,
        email,
        notes,
        special_requirements,
        expected_delivery_date,
        contract_reference,
        prepare_deadline,
        qc_deadline,
        shipping_deadline,
        'AWAITING_APPROVAL',
        totalAmount,
        created_by
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of finalItems) {
      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.subtotal
        ]
      );
    }

    await connection.commit();

    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function confirmOrder(orderId, confirmedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT id, status
      FROM orders
      WHERE id = ?
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    if (order.status !== 'AWAITING_APPROVAL') {
      throw new Error('Only orders in AWAITING_APPROVAL can be confirmed');
    }

    await connection.query(
      `
      UPDATE orders
      SET status = 'CONFIRMED',
          confirmed_by = ?,
          confirmed_at = NOW()
      WHERE id = ?
      `,
      [confirmedBy, orderId]
    );

    await connection.commit();

    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectOrder(orderId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT id, status
      FROM orders
      WHERE id = ?
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    if (order.status !== 'AWAITING_APPROVAL') {
      throw new Error('Only orders in AWAITING_APPROVAL can be rejected');
    }

    await connection.query(
      `
      UPDATE orders
      SET status = 'REJECTED'
      WHERE id = ?
      `,
      [orderId]
    );

    await connection.commit();

    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateDraftOrder(orderId, orderData) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. check order tồn tại
    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    // 2. chỉ cho update khi là draft
    if (order.status !== 'DRAFT') {
      throw new Error('Only DRAFT orders can be updated');
    }

    const {
      order_title,
      customer_name,
      phone,
      company_name,
      address,
      email,
      notes,
      special_requirements,
      expected_delivery_date,
      contract_reference,
      prepare_deadline,
      qc_deadline,
      shipping_deadline,
      items = []
    } = orderData;

    // 3. tính lại items
    let totalAmount = 0;
    const finalItems = [];

    for (const item of items) {
      const [productRows] = await connection.query(
        `SELECT id, unit_price FROM products WHERE id = ?`,
        [item.product_id]
      );

      if (productRows.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }

      const product = productRows[0];
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.unit_price);
      const subtotal = quantity * unitPrice;

      finalItems.push({
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        subtotal
      });

      totalAmount += subtotal;
    }

    // 4. update order
    await connection.query(
      `
      UPDATE orders
      SET
        order_title = ?,
        customer_name = ?,
        phone = ?,
        company_name = ?,
        address = ?,
        email = ?,
        notes = ?,
        special_requirements = ?,
        expected_delivery_date = ?,
        contract_reference = ?,
        prepare_deadline = ?,
        qc_deadline = ?,
        shipping_deadline = ?,
        total_amount = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        order_title,
        customer_name,
        phone,
        company_name,
        address,
        email,
        notes,
        special_requirements,
        expected_delivery_date,
        contract_reference,
        prepare_deadline,
        qc_deadline,
        shipping_deadline,
        totalAmount,
        orderId
      ]
    );

    // 5. xóa items cũ
    await connection.query(
      `DELETE FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    // 6. insert lại items mới
    for (const item of finalItems) {
      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.subtotal
        ]
      );
    }

    await connection.commit();

    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function submitDraftOrder(orderId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    // chỉ cho submit khi là draft
    if (order.status !== 'DRAFT') {
      throw new Error('Only DRAFT orders can be submitted');
    }

    await connection.query(
      `
      UPDATE orders
      SET status = 'AWAITING_APPROVAL',
          updated_at = NOW()
      WHERE id = ?
      `,
      [orderId]
    );

    await connection.commit();

    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function prepareOrder(orderId, confirmedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    if (orderRows[0].status !== 'CONFIRMED') {
      throw new Error('Only orders in CONFIRMED status can be marked as Prepared');
    }

    await connection.query(
      `UPDATE orders
       SET status = 'PREPARING',
           prepare_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [orderId]
    );

    await connection.commit();
    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function qcOrder(orderId, confirmedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    if (orderRows[0].status !== 'PREPARING') {
      throw new Error('Only orders in PREPARING status can be QC checked');
    }

    await connection.query(
      `UPDATE orders
       SET status = 'SHIPPING',
           qc_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [orderId]
    );

    await connection.commit();
    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function shipOrder(orderId, confirmedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    if (orderRows[0].status !== 'SHIPPING') {
      throw new Error('Only orders in SHIPPING status can be shipped');
    }

    await connection.query(
      `UPDATE orders
       SET status = 'AWAITING_INVOICE',
           shipping_completed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [orderId]
    );

    await connection.commit();
    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function completeOrder(orderId, confirmedBy) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id, status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    if (orderRows[0].status !== 'AWAITING_INVOICE') {
      throw new Error('Only orders in AWAITING_INVOICE status can be completed');
    }

    await connection.query(
      `UPDATE orders
       SET status = 'COMPLETED',
           delivered_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [orderId]
    );

    await connection.commit();
    return await getOrderById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createInvoice(orderId, invoiceData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { subtotal, tax, total, created_by } = invoiceData;
    
    // 1. Generate Invoice Code (INV-ORDCODE)
    const [orderRows] = await connection.query('SELECT order_code FROM orders WHERE id = ?', [orderId]);
    if (orderRows.length === 0) throw new Error('Order not found');
    const invoiceCode = `INV-${orderRows[0].order_code}`;

    // 2. Insert into invoices table
    await connection.query(`
      INSERT INTO invoices (order_id, invoice_code, subtotal_amount, tax_amount, total_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [orderId, invoiceCode, subtotal, tax, total, created_by]);

    // 3. Update order status to AWAITING_INVOICE
    await connection.query(`
      UPDATE orders SET status = 'AWAITING_INVOICE' WHERE id = ?
    `, [orderId]);

    await connection.commit();
    return { invoiceCode };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getInvoiceByOrderId(orderId) {
  const [rows] = await pool.query('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  getAllOrders,
  getOrderById,
  createDraftOrder,
  createSubmittedOrder,
  confirmOrder,
  rejectOrder,
  updateDraftOrder,
  submitDraftOrder,
  prepareOrder,
  qcOrder,
  shipOrder,
  completeOrder,
  createInvoice,
  getInvoiceByOrderId
};