DROP DATABASE IF EXISTS order_system;
CREATE DATABASE order_system;
USE order_system;

-- 1. Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('SALES_STAFF', 'ADMIN', 'ACCOUNTANT', 'TECH_STAFF') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,
  order_title VARCHAR(150) NOT NULL,

  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  company_name VARCHAR(100) NULL,
  address VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,

  notes VARCHAR(500) NULL,
  special_requirements TEXT NULL,

  expected_delivery_date DATE NOT NULL,
  contract_reference VARCHAR(100) NULL,

  prepare_deadline DATE NOT NULL,
  qc_deadline DATE NOT NULL,
  shipping_deadline DATE NOT NULL,

  prepare_completed_at DATETIME NULL,
  qc_completed_at DATETIME NULL,
  shipping_completed_at DATETIME NULL,
  delivered_at DATETIME NULL,

  status ENUM(
  'DRAFT',
  'AWAITING_APPROVAL',
  'REJECTED',
  'PREPARING',
  'QC',
  'SHIPPING',
  'COMPLETED',
  'AWAITING_INVOICE'
) NOT NULL DEFAULT 'DRAFT',

  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  created_by INT NOT NULL,
  confirmed_by INT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,

  CONSTRAINT fk_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users(id),

  CONSTRAINT fk_orders_confirmed_by
    FOREIGN KEY (confirmed_by) REFERENCES users(id)
);

-- 4. Order Items
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 5. Order Attachments
CREATE TABLE order_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type ENUM('CUSTOMER', 'SUPPLIER', 'APPENDIX') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by INT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_attachments_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_order_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id),

  CONSTRAINT uq_order_file_name UNIQUE (order_id, file_name)
);

-- 6. Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_expected_delivery_date ON orders(expected_delivery_date);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_attachments_order_id ON order_attachments(order_id);

-- 7. Invoices
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  invoice_code VARCHAR(30) NOT NULL UNIQUE,
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_invoices_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_invoices_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_invoices_order_id ON invoices(order_id);