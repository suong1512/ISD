const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration...');

        // Danh sách các câu lệnh SQL cần chạy
        // Mỗi khi bạn có thay đổi mới (thêm cột, đổi ENUM...), hãy thêm vào mảng này
        const migrations = [
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
