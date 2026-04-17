-- ============================================
-- DATABASE DATA DUMP
-- Generated at: 2026-04-17T09:48:28.789Z
-- This file contains all data from the database
-- Run: npm run db:import to import this data
-- ============================================

USE order_system;

SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data
TRUNCATE TABLE invoices;
TRUNCATE TABLE order_attachments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE users;

-- Table: users (4 rows)
INSERT INTO users (`id`, `full_name`, `email`, `password`, `role`, `created_at`)
VALUES
(1, 'Sales Staff 01', 'staff@example.com', '123456', 'SALES_STAFF', '2026-04-14 19:32:53'),
(2, 'Admin 01', 'admin@example.com', '123456', 'ADMIN', '2026-04-14 19:32:53'),
(3, 'Accountant 01', 'accountant@example.com', '123456', 'ACCOUNTANT', '2026-04-14 19:32:53'),
(4, 'Technical Staff 01', 'tech@example.com', '123456', 'TECH_STAFF', '2026-04-14 19:32:53');

-- Table: products (15 rows)
INSERT INTO products (`id`, `name`, `unit_price`, `created_at`)
VALUES
(1, 'Động cơ điện phòng nổ', '1500000.00', '2026-04-14 19:32:53'),
(2, 'Hộp giảm tốc', '2200000.00', '2026-04-14 19:32:53'),
(3, 'Bộ chống trôi ngược', '850000.00', '2026-04-14 19:32:53'),
(4, 'Múp nối thủy lực', '640000.00', '2026-04-14 19:32:53'),
(5, 'Phanh điện thủy lực', '990000.00', '2026-04-14 19:32:53'),
(6, 'Tời căng băng', '1750000.00', '2026-04-14 19:32:53'),
(7, 'Dây băng tải kháng cháy EP', '3000000.00', '2026-04-14 19:32:53'),
(8, 'Dây băng NN', '2800000.00', '2026-04-14 19:32:53'),
(9, 'Khởi động từ phòng nổ', '1250000.00', '2026-04-14 19:32:53'),
(10, 'Át tô mát phòng nổ', '1320000.00', '2026-04-14 19:32:53'),
(11, 'Khởi động mềm phòng nổ', '4100000.00', '2026-04-14 19:32:53'),
(12, 'Biến tần phòng nổ', '5200000.00', '2026-04-14 19:32:53'),
(13, 'Các cảm biến', '450000.00', '2026-04-14 19:32:53'),
(14, 'Cáp điện phòng nổ', '780000.00', '2026-04-14 19:32:53'),
(15, 'Nút bấm phòng nổ', '250000.00', '2026-04-14 19:32:53');

-- Table: orders (15 rows)
INSERT INTO orders (`id`, `order_code`, `order_title`, `customer_name`, `phone`, `company_name`, `address`, `email`, `notes`, `special_requirements`, `expected_delivery_date`, `contract_reference`, `prepare_deadline`, `qc_deadline`, `shipping_deadline`, `prepare_completed_at`, `qc_completed_at`, `shipping_completed_at`, `delivered_at`, `status`, `total_amount`, `created_by`, `confirmed_by`, `created_at`, `updated_at`, `confirmed_at`)
VALUES
(1, 'ORD-5122', 'Motor Supply', 'Ngân Trần', '0912345678', 'ABC Corp', '123 HCM', 'ngan@abc.com', 'Express', 'None', '2026-05-09 00:00:00', NULL, '2026-04-20 00:00:00', '2026-04-25 00:00:00', '2026-04-30 00:00:00', NULL, NULL, NULL, NULL, 'AWAITING_APPROVAL', '3850000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-14 19:32:53', NULL),
(2, 'ORD-3532', 'Gearbox Batch', 'Ngân Trần', '0912345678', 'GearWorks', '456 HN', 'ngan@abc.com', '', 'None', '2026-05-09 00:00:00', NULL, '2026-04-20 00:00:00', '2026-04-25 00:00:00', '2026-04-30 00:00:00', NULL, NULL, NULL, NULL, 'AWAITING_APPROVAL', '5200000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-14 19:32:53', NULL),
(3, 'ORD-6318', 'Conveyor Parts', 'Ngân Trần', '0912345678', 'Miners Ltd', '789 DN', 'ngan@abc.com', '', 'None', '2026-05-09 00:00:00', NULL, '2026-04-20 00:00:00', '2026-04-25 00:00:00', '2026-04-30 00:00:00', NULL, NULL, NULL, NULL, 'CONFIRMED', '12000000.00', 1, 2, '2026-04-14 19:32:53', '2026-04-14 20:11:50', '2026-04-14 20:11:50'),
(4, 'ORD-6787', 'Switchgear', 'suong', '0987654321', 'Power Solutions', 'Industrial Zone 1', 'suong@power.vn', 'Urgent', 'QC focus', '2026-05-06 00:00:00', NULL, '2026-04-10 00:00:00', '2026-04-15 00:00:00', '2026-04-20 00:00:00', '2026-04-14 20:12:18', '2026-04-15 23:17:44', '2026-04-17 11:59:53', '2026-04-17 12:03:57', 'COMPLETED', '8500000.00', 1, 2, '2026-04-14 19:32:53', '2026-04-17 12:03:57', '2026-04-14 20:11:48'),
(5, 'ORD-3518', 'Mining Cables', 'Ngân Trần', '0912345678', 'Deep Coal', 'Quang Ninh', 'ngan@coal.vn', '', 'None', '2026-04-20 00:00:00', NULL, '2026-03-25 00:00:00', '2026-03-30 00:00:00', '2026-04-05 00:00:00', NULL, NULL, '2026-04-14 20:00:17', '2026-04-17 15:44:23', 'COMPLETED', '15000000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-17 15:44:23', NULL),
(6, 'ORD-2579', 'Backup Sensors', 'Updated Name', '0333444555', 'Tech Hub', 'District 1', 'tech@hub.com', '', 'None', '2026-04-30 00:00:00', NULL, '2026-04-10 00:00:00', '2026-04-15 00:00:00', '2026-04-20 00:00:00', '2026-04-14 20:12:16', '2026-04-14 20:15:23', '2026-04-14 20:15:26', '2026-04-17 10:45:41', 'COMPLETED', '2200000.00', 1, 2, '2026-04-14 19:32:53', '2026-04-17 10:45:41', '2026-04-14 20:11:45'),
(7, 'ORD-8514', 'Heavy Duty Belts', 'gfgfgfd', '0909090909', 'Factory X', 'Binh Duong', 'x@factory.com', '', 'None', '2026-04-23 00:00:00', NULL, '2026-04-05 00:00:00', '2026-04-10 00:00:00', '2026-04-15 00:00:00', '2026-04-14 20:12:14', NULL, NULL, NULL, 'PREPARING', '9000000.00', 1, 2, '2026-04-14 19:32:53', '2026-04-14 20:12:14', '2026-04-14 20:11:43'),
(8, 'ORD-4291', 'Urgent Courier', 'AC', '0111222333', 'Global Logistic', 'Airport Rd', 'info@global.com', 'Delayed', 'None', '2026-04-04 00:00:00', NULL, '2026-03-20 00:00:00', '2026-03-25 00:00:00', '2026-03-28 00:00:00', '2026-04-14 20:12:12', NULL, NULL, NULL, 'PREPARING', '4500000.00', 1, 2, '2026-04-14 19:32:53', '2026-04-14 20:12:12', '2026-04-14 20:11:41'),
(9, 'ORD-7632', 'Defective Order', '2222', '0000000000', 'Rejected Inc', 'Mistake St', 'bad@reject.com', '', 'None', '2026-03-26 00:00:00', NULL, '2026-03-20 00:00:00', '2026-03-22 00:00:00', '2026-03-24 00:00:00', NULL, NULL, NULL, NULL, 'REJECTED', '3000000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-14 19:32:53', NULL),
(10, 'ORD-0472', 'Confirmed Project', 'ád', '0999888777', 'Started LLC', 'Progress Ave', 'go@start.com', '', 'None', '2026-03-25 00:00:00', NULL, '2026-04-20 00:00:00', '2026-04-25 00:00:00', '2026-04-30 00:00:00', '2026-04-14 20:00:26', '2026-04-14 20:07:17', '2026-04-14 20:07:41', '2026-04-17 15:41:59', 'COMPLETED', '1200000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-17 15:41:59', NULL),
(11, 'ORD-4647', 'Old Reject', 'dsfgertghr', '0555666777', 'Fail Co', 'Back Side', 'fail@co.com', '', 'None', '2026-04-16 00:00:00', NULL, '2026-03-10 00:00:00', '2026-03-15 00:00:00', '2026-03-18 00:00:00', NULL, NULL, NULL, NULL, 'REJECTED', '500000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-14 19:32:53', NULL),
(12, 'ORD-9999', 'Success Story', 'Victory', '0123445667', 'Winner Corp', 'Prime Bldg', 'win@corp.com', '', 'None', '2026-03-20 00:00:00', NULL, '2026-03-10 00:00:00', '2026-03-12 00:00:00', '2026-03-15 00:00:00', NULL, NULL, NULL, NULL, 'COMPLETED', '20000000.00', 1, NULL, '2026-04-14 19:32:53', '2026-04-14 19:32:53', NULL),
(13, 'ORD-6687', 'sdfgyuik', 'sdfgyuik', '0123455678', 'xcbnm', 'qưertyui', 'abc@gmail.com', 'ádd', '', '2026-05-30 00:00:00', 'ád', '2026-04-23 00:00:00', '2026-04-30 00:00:00', '2026-05-09 00:00:00', NULL, NULL, NULL, NULL, 'REJECTED', '32620000.00', 1, NULL, '2026-04-14 19:43:05', '2026-04-17 15:49:04', NULL),
(14, 'ORD-7997', 'sdfgyuik', 'sdfgyuik', '0123455678', 'xcbnm', 'qưertyui', 'abc@gmail.com', 'ss', '', '2026-05-10 00:00:00', 'ssd', '2026-04-17 00:00:00', '2026-04-21 00:00:00', '2026-04-30 00:00:00', NULL, NULL, NULL, NULL, 'AWAITING_APPROVAL', '990000.00', 1, NULL, '2026-04-14 20:10:29', '2026-04-14 20:10:29', NULL),
(15, 'ORD-2321', 'sdfgyuik', 'sdfgyuik', '0123455678', 'xcbnm', 'qưertyui', 'abc@gmail.com', '', '', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'DRAFT', '1250000.00', 1, NULL, '2026-04-14 20:13:43', '2026-04-14 20:13:43', NULL);

-- Table: order_items (11 rows)
INSERT INTO order_items (`id`, `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`, `created_at`)
VALUES
(1, 1, 1, 1, '1500000.00', '1500000.00', '2026-04-14 19:32:53'),
(2, 1, 3, 1, '850000.00', '850000.00', '2026-04-14 19:32:53'),
(3, 2, 2, 2, '2200000.00', '4400000.00', '2026-04-14 19:32:53'),
(4, 5, 14, 10, '780000.00', '7800000.00', '2026-04-14 19:32:53'),
(5, 8, 1, 3, '1500000.00', '4500000.00', '2026-04-14 19:32:53'),
(6, 13, 12, 1, '5200000.00', '5200000.00', '2026-04-14 19:43:05'),
(7, 13, 4, 3, '640000.00', '1920000.00', '2026-04-14 19:43:05'),
(8, 13, 2, 6, '2200000.00', '13200000.00', '2026-04-14 19:43:05'),
(9, 13, 11, 3, '4100000.00', '12300000.00', '2026-04-14 19:43:05'),
(10, 14, 5, 1, '990000.00', '990000.00', '2026-04-14 20:10:29'),
(11, 15, 9, 1, '1250000.00', '1250000.00', '2026-04-14 20:13:43');

-- Table: order_attachments (5 rows)
INSERT INTO order_attachments (`id`, `order_id`, `file_name`, `file_type`, `file_path`, `uploaded_by`, `uploaded_at`)
VALUES
(1, 1, 'spec-1.pdf', 'CUSTOMER', 'uploads/sep-1.pdf', 1, '2026-04-14 19:32:53'),
(2, 5, 'shipping-doc.pdf', 'CUSTOMER', 'uploads/ship.pdf', 1, '2026-04-14 19:32:53'),
(3, 8, 'invoice-ac.pdf', 'CUSTOMER', 'uploads/inv.pdf', 1, '2026-04-14 19:32:53'),
(4, 13, 'POP1.pdf', 'CUSTOMER', '/uploads/1776170585736-378402243.pdf', 1, '2026-04-14 19:43:05'),
(5, 14, 'POP1.pdf', 'CUSTOMER', '/uploads/1776172229814-565323024.pdf', 1, '2026-04-14 20:10:29');

-- Table: invoices (2 rows)
INSERT INTO invoices (`id`, `order_id`, `invoice_code`, `subtotal_amount`, `tax_amount`, `total_amount`, `created_by`, `created_at`)
VALUES
(1, 10, 'INV-ORD-0472', '0.00', '0.00', '0.00', 3, '2026-04-17 15:41:49'),
(2, 5, 'INV-ORD-3518', '7800000.00', '780000.00', '8580000.00', 3, '2026-04-17 15:43:21');

SET FOREIGN_KEY_CHECKS = 1;
