const pool = require('../config/db');

async function login(email, password) {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role FROM users WHERE email = ? AND password = ?',
    [email, password]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role FROM users WHERE id = ?',
    [id]
  );

  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  login,
  getUserById
};
