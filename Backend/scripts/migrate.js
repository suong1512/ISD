const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration...');

        // Danh sách các câu lệnh SQL cần chạy
        // Mỗi khi bạn có thay đổi mới (thêm cột, đổi ENUM...), hãy thêm vào mảng này
        const migrations = [
            {
                name: 'Update User Role ENUM',
                sql: `ALTER TABLE users MODIFY COLUMN role ENUM(
                    'SALES_STAFF', 
                    'ADMIN', 
                    'ACCOUNTANT', 
                    'TECH_STAFF'
                ) NOT NULL`
            },
            {
                name: 'Update Order Status ENUM',
                sql: `ALTER TABLE orders MODIFY COLUMN status ENUM(
                    'DRAFT',
                    'AWAITING_APPROVAL',
                    'REJECTED',
                    'CONFIRMED',
                    'PREPARING',
                    'QC',
                    'SHIPPING',
                    'AWAITING_INVOICE',
                    'COMPLETED',
                    'OVERDUE'
                ) NOT NULL DEFAULT 'DRAFT'`
            },
            {
                name: 'Create Invoices Table',
                sql: `CREATE TABLE IF NOT EXISTS invoices (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL UNIQUE,
                    invoice_code VARCHAR(30) NOT NULL UNIQUE,
                    subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    created_by INT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )`
            }
            // { name: 'Add new column sample', sql: 'ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)' }
        ];

        for (const migration of migrations) {
            console.log(`Running: ${migration.name}...`);
            await pool.query(migration.sql);
            console.log(`Success: ${migration.name}`);
        }

        console.log('\n Database is up to date!');
    } catch (error) {
        console.error('\n Migration failed:', error.message);
    } finally {
        process.exit();
    }
}

migrate();
