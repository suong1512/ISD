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
      o.updated_at,
      o.confirmed_at,
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
    let isPrepareDelayed =
      !order.prepare_completed_at && isPast(order.prepare_deadline);

    const isQcDelayed =
      !order.qc_completed_at && isPast(order.qc_deadline);

    const isShippingDelayed =
      !order.shipping_completed_at && isPast(order.shipping_deadline);

    let isDeliveryDelayed =
      !order.delivered_at && isPast(order.expected_delivery_date);

    // Special logic for AWAITING_APPROVAL priority
    if (order.status === 'AWAITING_APPROVAL') {
      if (order.prepare_deadline) {
        const d = new Date(order.prepare_deadline);
        d.setDate(d.getDate() + 1);
        const deadlinePlus1 = d.toISOString().split('T')[0];
        isPrepareDelayed = isPast(deadlinePlus1);
        isDeliveryDelayed = false;
      } else {
        isPrepareDelayed = false;
        isDeliveryDelayed = isPast(order.expected_delivery_date);
      }
    }

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
      updated_at: order.updated_at,
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

  let isPrepareDelayed = !order.prepare_completed_at && isPast(order.prepare_deadline);
  let isQcDelayed = !order.qc_completed_at && isPast(order.qc_deadline);
  let isShippingDelayed = !order.shipping_completed_at && isPast(order.shipping_deadline);
  let isDeliveryDelayed = !order.delivered_at && isPast(order.expected_delivery_date);

  // Apply special AWAITING_APPROVAL logic for detail view flags
  if (order.status === 'AWAITING_APPROVAL') {
    if (order.prepare_deadline) {
      const d = new Date(order.prepare_deadline);
      d.setDate(d.getDate() + 1);
      isPrepareDelayed = isPast(d.toISOString().split('T')[0]);
      isDeliveryDelayed = false;
    } else {
      isPrepareDelayed = false;
      isDeliveryDelayed = isPast(order.expected_delivery_date);
    }
  }

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
    prepare_completed_at: order.prepare_completed_at,
    qc_completed_at: order.qc_completed_at,
    shipping_completed_at: order.shipping_completed_at,
    delivered_at: order.delivered_at,
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
        expected_delivery_date || null,
        contract_reference,
        prepare_deadline || null,
        qc_deadline || null,
        shipping_deadline || null,
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
      SET status = 'PREPARING',
          confirmed_by = ?,
          confirmed_at = NOW(),
          updated_at = NOW()
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
      SET status = 'REJECTED',
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
        expected_delivery_date || null,
        contract_reference,
        prepare_deadline || null,
        qc_deadline || null,
        shipping_deadline || null,
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

    if (orderRows[0].status !== 'PREPARING') {
      throw new Error('Only orders in PREPARING status can be marked as Prepared');
    }

    await connection.query(
      `UPDATE orders
       SET status = 'QC',
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

    if (orderRows[0].status !== 'QC') {
      throw new Error('Only orders in QC status can be QC checked');
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
      UPDATE orders SET status = 'AWAITING_INVOICE', updated_at = NOW() WHERE id = ?
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

async function getDashboardStats() {
  // 1. Status counts (exclude DRAFT for admin dashboard)
  const [statusRows] = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE status != 'DRAFT'
    GROUP BY status
  `);

  const statusCounts = {
    'AWAITING_APPROVAL': 0,
    'PREPARING': 0,
    'QC': 0,
    'SHIPPING': 0,
    'AWAITING_INVOICE': 0,
    'COMPLETED': 0,
    'REJECTED': 0
  };
  let totalOrders = 0;

  statusRows.forEach(row => {
    statusCounts[row.status] = row.count;
    totalOrders += row.count;
  });

  // 2. Active Orders = All statuses except COMPLETED and REJECTED
  const activeOrders = statusCounts['AWAITING_APPROVAL'] +
                       statusCounts['PREPARING'] + statusCounts['QC'] +
                       statusCounts['SHIPPING'] + statusCounts['AWAITING_INVOICE'];

  // 3. Overdue count (delayed orders based on deadlines, excluding completed/rejected/draft)
  const [overdueRows] = await pool.query(`
    SELECT COUNT(*) as count FROM orders
    WHERE status NOT IN ('DRAFT', 'COMPLETED', 'REJECTED')
    AND (
      (status = 'AWAITING_APPROVAL' AND (
        (prepare_deadline IS NOT NULL AND DATE_ADD(prepare_deadline, INTERVAL 1 DAY) <= CURDATE()) OR
        (prepare_deadline IS NULL AND expected_delivery_date IS NOT NULL AND expected_delivery_date <= CURDATE())
      )) OR
      (status = 'PREPARING' AND prepare_deadline IS NOT NULL AND prepare_deadline <= CURDATE()) OR
      (status = 'QC' AND qc_deadline IS NOT NULL AND qc_deadline <= CURDATE()) OR
      (status = 'SHIPPING' AND shipping_deadline IS NOT NULL AND shipping_deadline <= CURDATE()) OR
      (status = 'AWAITING_INVOICE' AND expected_delivery_date IS NOT NULL AND expected_delivery_date <= CURDATE()) OR
      (status NOT IN ('AWAITING_APPROVAL', 'PREPARING', 'QC', 'SHIPPING', 'AWAITING_INVOICE') AND expected_delivery_date IS NOT NULL AND expected_delivery_date <= CURDATE())
    )
  `);
  const overdueCount = overdueRows[0].count;

  // 4. High priority count (deadline within 3 days but not yet overdue)
  const [highPriorityRows] = await pool.query(`
    SELECT COUNT(*) as count FROM orders
    WHERE status NOT IN ('DRAFT', 'COMPLETED', 'REJECTED')
    AND (
      (status = 'AWAITING_APPROVAL' AND (
        (prepare_deadline IS NOT NULL AND DATE_ADD(prepare_deadline, INTERVAL 1 DAY) BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
        (prepare_deadline IS NULL AND expected_delivery_date IS NOT NULL AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY))
      )) OR
      (status = 'PREPARING' AND prepare_deadline IS NOT NULL AND prepare_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'QC' AND qc_deadline IS NOT NULL AND qc_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'SHIPPING' AND shipping_deadline IS NOT NULL AND shipping_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'AWAITING_INVOICE' AND expected_delivery_date IS NOT NULL AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status NOT IN ('AWAITING_APPROVAL', 'PREPARING', 'QC', 'SHIPPING', 'AWAITING_INVOICE') AND expected_delivery_date IS NOT NULL AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY))
    )
  `);
  const highPriorityCount = highPriorityRows[0].count;

  // 5. Order Cycle Time: avg days from created_at to updated_at for COMPLETED orders (last 30 days)
  const [cycleRows] = await pool.query(`
    SELECT AVG(DATEDIFF(updated_at, created_at)) as avg_days
    FROM orders
    WHERE status = 'COMPLETED'
    AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  `);
  const avgCycleTime = cycleRows[0].avg_days ? parseFloat(cycleRows[0].avg_days).toFixed(1) : '0.0';

  // 6. Workload distribution by department (only active orders, COMPLETED/REJECTED = None)
  const workload = {
    Sales: statusCounts['AWAITING_APPROVAL'],
    Technical: statusCounts['PREPARING'] + statusCounts['QC'] + statusCounts['SHIPPING'],
    Accountant: statusCounts['AWAITING_INVOICE']
  };

  // 7. Bottleneck analysis: avg days spent in each stage for completed orders
  const [bottleneckRows] = await pool.query(`
    SELECT
      AVG(DATEDIFF(COALESCE(confirmed_at, updated_at), created_at)) as avg_approval,
      AVG(DATEDIFF(COALESCE(prepare_completed_at, updated_at), COALESCE(confirmed_at, created_at))) as avg_prepare,
      AVG(DATEDIFF(COALESCE(qc_completed_at, updated_at), COALESCE(prepare_completed_at, confirmed_at, created_at))) as avg_qc,
      AVG(DATEDIFF(COALESCE(shipping_completed_at, updated_at), COALESCE(qc_completed_at, prepare_completed_at, created_at))) as avg_shipping,
      AVG(DATEDIFF(COALESCE(delivered_at, updated_at), COALESCE(shipping_completed_at, qc_completed_at, created_at))) as avg_invoicing
    FROM orders
    WHERE status = 'COMPLETED'
    AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  `);

  const bottleneck = bottleneckRows[0] ? {
    approval: parseFloat(bottleneckRows[0].avg_approval || 0).toFixed(1),
    prepare: parseFloat(bottleneckRows[0].avg_prepare || 0).toFixed(1),
    qc: parseFloat(bottleneckRows[0].avg_qc || 0).toFixed(1),
    shipping: parseFloat(bottleneckRows[0].avg_shipping || 0).toFixed(1),
    invoicing: parseFloat(bottleneckRows[0].avg_invoicing || 0).toFixed(1)
  } : { approval: '0', prepare: '0', qc: '0', shipping: '0', invoicing: '0' };

  // 8. Trend data: orders created per day in last 7 days
  const [trendRows] = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM orders
    WHERE status != 'DRAFT'
    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // 9. Alerts: get delayed orders with details
  const [alertRows] = await pool.query(`
    SELECT id, order_code, customer_name, status, updated_at,
      prepare_deadline, qc_deadline, shipping_deadline, expected_delivery_date,
      prepare_completed_at, qc_completed_at, shipping_completed_at, delivered_at,
      (prepare_completed_at IS NULL AND prepare_deadline IS NOT NULL AND 
        (CASE WHEN status = 'AWAITING_APPROVAL' THEN DATE_ADD(prepare_deadline, INTERVAL 1 DAY) ELSE prepare_deadline END) <= CURDATE()) as is_prepare_delayed,
      (qc_completed_at IS NULL AND qc_deadline IS NOT NULL AND qc_deadline <= CURDATE()) as is_qc_delayed,
      (shipping_completed_at IS NULL AND shipping_deadline IS NOT NULL AND shipping_deadline <= CURDATE()) as is_shipping_delayed,
      (delivered_at IS NULL AND expected_delivery_date IS NOT NULL AND status != 'AWAITING_APPROVAL' AND expected_delivery_date <= CURDATE()) as is_delivery_delayed,
      (
        (prepare_deadline IS NOT NULL AND prepare_completed_at IS NULL AND
          (CASE WHEN status = 'AWAITING_APPROVAL' THEN DATE_ADD(prepare_deadline, INTERVAL 1 DAY) ELSE prepare_deadline END) BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY))
        OR (qc_deadline IS NOT NULL AND qc_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND qc_completed_at IS NULL)
        OR (shipping_deadline IS NOT NULL AND shipping_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND shipping_completed_at IS NULL)
        OR (expected_delivery_date IS NOT NULL AND status != 'AWAITING_APPROVAL' AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND delivered_at IS NULL)
      ) as is_high_priority
    FROM orders
    WHERE status NOT IN ('DRAFT', 'COMPLETED', 'REJECTED')
    AND (
      -- Overdue
      (status = 'AWAITING_APPROVAL' AND (
        (prepare_deadline IS NOT NULL AND DATE_ADD(prepare_deadline, INTERVAL 1 DAY) <= CURDATE()) OR
        (prepare_deadline IS NULL AND expected_delivery_date IS NOT NULL AND expected_delivery_date <= CURDATE())
      )) OR
      (status = 'PREPARING' AND prepare_deadline IS NOT NULL AND prepare_deadline <= CURDATE()) OR
      (status = 'QC' AND qc_deadline IS NOT NULL AND qc_deadline <= CURDATE()) OR
      (status = 'SHIPPING' AND shipping_deadline IS NOT NULL AND shipping_deadline <= CURDATE()) OR
      (status = 'AWAITING_INVOICE' AND expected_delivery_date IS NOT NULL AND expected_delivery_date <= CURDATE()) OR
      -- High Priority
      (status = 'AWAITING_APPROVAL' AND (
        (prepare_deadline IS NOT NULL AND DATE_ADD(prepare_deadline, INTERVAL 1 DAY) BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
        (prepare_deadline IS NULL AND expected_delivery_date IS NOT NULL AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY))
      )) OR
      (status = 'PREPARING' AND prepare_deadline IS NOT NULL AND prepare_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'QC' AND qc_deadline IS NOT NULL AND qc_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'SHIPPING' AND shipping_deadline IS NOT NULL AND shipping_deadline BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) OR
      (status = 'AWAITING_INVOICE' AND expected_delivery_date IS NOT NULL AND expected_delivery_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND DATE_ADD(CURDATE(), INTERVAL 3 DAY))
    )
    ORDER BY updated_at DESC
    LIMIT 10
  `);

  // 10. Recent activity  
  const [activityRows] = await pool.query(`
    SELECT o.id, o.order_code, o.customer_name, o.status, o.updated_at, o.created_at,
      u.full_name as created_by_name,
      (o.prepare_completed_at IS NULL AND o.prepare_deadline IS NOT NULL AND o.prepare_deadline < CURDATE()) as is_prepare_delayed,
      (o.qc_completed_at IS NULL AND o.qc_deadline IS NOT NULL AND o.qc_deadline < CURDATE()) as is_qc_delayed,
      (o.shipping_completed_at IS NULL AND o.shipping_deadline IS NOT NULL AND o.shipping_deadline < CURDATE()) as is_shipping_delayed,
      (o.delivered_at IS NULL AND o.expected_delivery_date IS NOT NULL AND o.expected_delivery_date < CURDATE()) as is_delivery_delayed
    FROM orders o
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status != 'DRAFT' AND o.updated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    ORDER BY o.updated_at DESC
    LIMIT 100
  `);

  return {
    kpi: {
      totalOrders,
      activeOrders,
      highPriorityCount,
      overdueCount,
      avgCycleTime
    },
    statusCounts: {
      'Awaiting Approval': statusCounts['AWAITING_APPROVAL'] || 0,
      'Preparing': statusCounts['PREPARING'] || 0,
      'QC Checking': statusCounts['QC'] || 0,
      'Shipping': statusCounts['SHIPPING'] || 0,
      'Awaiting Invoice': statusCounts['AWAITING_INVOICE'] || 0,
      'Completed': statusCounts['COMPLETED'] || 0,
      'Rejected': statusCounts['REJECTED'] || 0
    },
    workload,
    bottleneck,
    trend: trendRows,
    alerts: alertRows,
    activity: activityRows
  };
}

async function addNote(orderId, noteText, authorName, authorRole) {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query('SELECT notes FROM orders WHERE id = ?', [orderId]);
    if (rows.length === 0) {
      throw new Error('Order not found');
    }

    const currentNotes = rows[0].notes || '';
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const noteEntry = `[${timestamp}] ${authorRole} (${authorName}):\n${noteText}\n\n`;
    const updatedNotes = noteEntry + currentNotes;

    await connection.query(
      'UPDATE orders SET notes = ?, updated_at = NOW() WHERE id = ?',
      [updatedNotes, orderId]
    );

    return { success: true, notes: updatedNotes };
  } finally {
    connection.release();
  }
}

async function deleteNote(orderId, noteIndex) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT notes FROM orders WHERE id = ?', [orderId]);
    if (rows.length === 0) throw new Error('Order not found');

    let notes = rows[0].notes || '';
    // Split by the double newline that separates entries
    let noteBlocks = notes.split('\n\n').filter(block => block.trim() !== '');
    
    // The noteIndex refers to the blocks from the top (newest first)
    if (noteIndex >= 0 && noteIndex < noteBlocks.length) {
      // Check if it's a "Creation Note" by checking for the header pattern
      const hasHeader = /\[.*?\] .*?\(.*?\):/.test(noteBlocks[noteIndex]);
      if (!hasHeader) {
        throw new Error('Cannot delete creation notes');
      }
      
      noteBlocks.splice(noteIndex, 1);
      const updatedNotes = noteBlocks.length > 0 ? noteBlocks.join('\n\n') + '\n\n' : '';
      
      await connection.query(
        'UPDATE orders SET notes = ?, updated_at = NOW() WHERE id = ?',
        [updatedNotes, orderId]
      );
      
      return { success: true, notes: updatedNotes };
    } else {
      throw new Error('Note not found');
    }
  } finally {
    connection.release();
  }
}

async function getInvoiceByOrderId(orderId) {
  const [rows] = await pool.query('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
  return rows[0] || null;
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
  getInvoiceByOrderId,
  getDashboardStats,
  addNote,
  deleteNote
};