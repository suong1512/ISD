const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Setup database hoàn chỉnh cho máy mới:
 * 1. Tạo database nếu chưa có
 * 2. Chạy schema.sql (tạo bảng)
 * 3. Import data_dump.sql (nếu có) HOẶC seed.sql (data mẫu)
 * 
 * Cách dùng: npm run db:setup
 * Đây là lệnh DUY NHẤT cần chạy khi pull project về máy mới
 */
async function setupDatabase() {
    let connection;
    try {
        console.log('🚀 Starting Full Database Setup...\n');

        const dbName = process.env.DB_NAME || 'order_system';

        // Bước 1: Kết nối MySQL (không chọn database cụ thể)
        console.log('📡 Step 1: Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });
        console.log('   ✅ Connected to MySQL server\n');

        // Bước 2: Chạy schema.sql (đã bao gồm DROP + CREATE DATABASE)
        console.log('📋 Step 2: Running schema.sql (create database + tables)...');
        const schemaPath = path.join(__dirname, '../../Database/schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await connection.query(schemaSql);
        console.log('   ✅ Database and tables created\n');

        // Bước 3: Chạy migrate.js logic (update ENUMs, thêm tables mới)
        console.log('🔄 Step 3: Running migrations...');
        await connection.query(`USE ${dbName}`);

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
        ];

        for (const migration of migrations) {
            try {
                await connection.query(migration.sql);
                console.log(`   ✅ ${migration.name}`);
            } catch (err) {
                // Bỏ qua lỗi nếu migration đã chạy rồi (duplicate column, etc.)
                console.log(`   ⏭️  ${migration.name} (skipped - already applied)`);
            }
        }
        console.log('');

        // Bước 4: Import data
        const dumpPath = path.join(__dirname, '../../Database/data_dump.sql');
        const seedPath = path.join(__dirname, '../../Database/seed.sql');

        if (fs.existsSync(dumpPath)) {
            // Ưu tiên data_dump.sql (data thật từ database gốc)
            console.log('📥 Step 4: Importing data from data_dump.sql (real data)...');
            const dumpSql = fs.readFileSync(dumpPath, 'utf8');
            await connection.query(dumpSql);
            console.log('   ✅ Real data imported\n');
        } else if (fs.existsSync(seedPath)) {
            // Fallback: dùng seed.sql (data mẫu)
            console.log('📥 Step 4: Importing data from seed.sql (sample data)...');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await connection.query(seedSql);
            console.log('   ✅ Sample data imported\n');
        } else {
            console.log('⚠️  Step 4: No data file found. Database is empty.\n');
        }

        // Bước 5: Verify
        console.log('📊 Verification:');
        console.log('─'.repeat(35));

        const tables = ['users', 'products', 'orders', 'order_items', 'order_attachments', 'invoices'];
        for (const table of tables) {
            try {
                const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${dbName}.${table}`);
                console.log(`   ${table}: ${rows[0].count} rows`);
            } catch (e) {
                console.log(`   ${table}: (not found)`);
            }
        }

        console.log('─'.repeat(35));
        console.log('\n🎉 Database setup completed!');
        console.log('🚀 You can now run: npm run dev');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Kiểm tra lại DB_USER và DB_PASSWORD trong file .env');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 MySQL server chưa chạy. Hãy start MySQL trước.');
        }
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

setupDatabase();
