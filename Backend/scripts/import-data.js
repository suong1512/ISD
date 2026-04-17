const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

/**
 * Import data từ file Database/data_dump.sql vào database local
 * File này chứa toàn bộ data được export từ database gốc
 * 
 * Cách dùng: npm run db:import
 * Yêu cầu: Database và schema phải đã được tạo trước (chạy schema.sql hoặc npm run db:setup)
 */
async function importData() {
    try {
        console.log('📥 Starting Database Import...\n');

        // Kiểm tra file data_dump.sql
        const dumpPath = path.join(__dirname, '../../Database/data_dump.sql');

        if (!fs.existsSync(dumpPath)) {
            console.error('❌ File not found: Database/data_dump.sql');
            console.error('💡 Hãy yêu cầu người có database chạy: npm run db:export');
            process.exit(1);
        }

        const sql = fs.readFileSync(dumpPath, 'utf8');
        const fileSize = (fs.statSync(dumpPath).size / 1024).toFixed(1);

        console.log(`📁 Reading: Database/data_dump.sql (${fileSize} KB)`);
        console.log('⏳ Importing data...\n');

        await pool.query(sql);

        // Verify - đếm số rows trong mỗi table
        const tables = ['users', 'products', 'orders', 'order_items', 'order_attachments', 'invoices'];

        console.log('📊 Import results:');
        console.log('─'.repeat(35));

        for (const table of tables) {
            try {
                const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ${table}: ${rows[0].count} rows`);
            } catch (e) {
                console.log(`   ${table}: (table not found)`);
            }
        }

        console.log('─'.repeat(35));
        console.log('\n✅ Import completed successfully!');

    } catch (error) {
        console.error('\n❌ Import failed:', error.message);

        if (error.message.includes("doesn't exist")) {
            console.error('\n💡 Database hoặc table chưa tồn tại.');
            console.error('   Chạy schema trước: npm run db:setup');
        }
    } finally {
        process.exit();
    }
}

importData();
