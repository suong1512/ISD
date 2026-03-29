const pool = require('../config/db');

async function addOrderAttachment(orderId, fileData) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `SELECT id FROM orders WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const {
      file_name,
      file_type,
      file_path,
      uploaded_by
    } = fileData;

    await connection.query(
      `
      INSERT INTO order_attachments (
        order_id,
        file_name,
        file_type,
        file_path,
        uploaded_by
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [orderId, file_name, file_type, file_path, uploaded_by]
    );

    await connection.commit();

    const [attachmentRows] = await connection.query(
      `
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
      `,
      [orderId]
    );

    return attachmentRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteOrderAttachment(orderId, attachmentId) {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `DELETE FROM order_attachments WHERE id = ? AND order_id = ?`,
      [attachmentId, orderId]
    );
  } finally {
    connection.release();
  }
}

module.exports = {
  addOrderAttachment,
  deleteOrderAttachment
};