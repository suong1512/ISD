const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const pool = require('./src/config/db');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const authRoutes = require('./src/routes/authRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/app', express.static(path.join(__dirname, '..', 'Fontend')));

app.get('/', (req, res) => {
  res.redirect('/app/gate/gate.html');
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result');

    res.json({
      message: 'Database connected successfully',
      data: rows
    });
  } catch (error) {
    console.error('DB connection error:', error);

    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.get('/debug-db', async (req, res) => {
  try {
    const [dbRows] = await pool.query(`
      SELECT DATABASE() AS db_name, @@hostname AS hostname, @@port AS port, @@version AS version
    `);

    const [orderRows] = await pool.query(`
      SELECT id, order_code, status, customer_name, created_at
      FROM orders
      ORDER BY id DESC
      LIMIT 10
    `);

    res.json({
      db_info: dbRows[0],
      orders: orderRows
    });
  } catch (error) {
    console.error('Error in /debug-db:', error);
    res.status(500).json({
      message: 'Debug DB failed',
      error: error.message
    });
  }
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});