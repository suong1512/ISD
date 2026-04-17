USE order_system;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_attachments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- Users mẫu
INSERT INTO users (full_name, email, password, role)
VALUES 
('Sales Staff 01', 'staff@example.com', '123456', 'SALES_STAFF'),
('Admin 01', 'admin@example.com', '123456', 'ADMIN'),
('Accountant 01', 'accountant@example.com', '123456', 'ACCOUNTANT'),
('Technical Staff 01', 'tech@example.com', '123456', 'TECH_STAFF');

-- Products mẫu cho dropdown
INSERT INTO products (name, unit_price)
VALUES
('Động cơ điện phòng nổ', 1500000.00),
('Hộp giảm tốc', 2200000.00),
('Bộ chống trôi ngược', 850000.00),
('Múp nối thủy lực', 640000.00),
('Phanh điện thủy lực', 990000.00),
('Tời căng băng', 1750000.00),
('Dây băng tải kháng cháy EP', 3000000.00),
('Dây băng NN', 2800000.00),
('Khởi động từ phòng nổ', 1250000.00),
('Át tô mát phòng nổ', 1320000.00),
('Khởi động mềm phòng nổ', 4100000.00),
('Biến tần phòng nổ', 5200000.00),
('Các cảm biến', 450000.00),
('Cáp điện phòng nổ', 780000.00),
('Nút bấm phòng nổ', 250000.00),
('Chuông điện phòng nổ', 290000.00),
('Đèn lốp phòng nổ', 390000.00),
('Hộp nối cáp phòng nổ', 430000.00),
('Biến áp chiếu sáng', 920000.00);

-- Order mẫu
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
VALUES (
  'ORD-202603-0001',
  'Sample Order 01',
  'Nguyen Van A',
  '0912345678',
  'ABC Company',
  '123 Le Loi, HCM',
  'a@gmail.com',
  'Sample note',
  'None',
  '2026-04-10',
  'CR-001',
  '2026-04-01',
  '2026-04-03',
  '2026-04-05',
  'DRAFT',
  3850000.00,
  1
);

-- Order items mẫu
INSERT INTO order_items (
  order_id,
  product_id,
  quantity,
  unit_price,
  subtotal
)
VALUES
(1, 1, 1, 1500000.00, 1500000.00),
(1, 3, 1, 850000.00, 850000.00),
(1, 5, 1, 990000.00, 990000.00),
(1, 15, 2, 250000.00, 500000.00);

-- Attachment mẫu
INSERT INTO order_attachments (
  order_id,
  file_name,
  file_type,
  file_path,
  uploaded_by
)
VALUES
(1, 'contract-a.pdf', 'CUSTOMER', 'uploads/contract-a.pdf', 1);