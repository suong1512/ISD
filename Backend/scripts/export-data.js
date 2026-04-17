const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

/**
 * Export toàn bộ data từ database hiện tại ra file SQL
 * File output: Database/data_dump.sql
 * 
 * Cách dùng: npm run db:export
 * Sau đó commit file data_dump.sql lên git để người khác pull về dùng
 */
async function exportData() {
    let connection;
    try {
        console.log('📦 Starting Database Export...\n');

        connection = await pool.getConnection();

        // Lấy danh sách tất cả các table theo thứ tự (quan trọng vì FK constraint)
        const tableOrder = [
            'users',
            'products',
            'orders',
            'order_items',
            'order_attachments',
            'invoices'
        ];

        let sqlDump = '';

        // Header
        sqlDump += '-- ============================================\n';
        sqlDump += '-- DATABASE DATA DUMP\n';
        sqlDump += `-- Generated at: ${new Date().toISOString()}\n`;
        sqlDump += '-- This file contains all data from the database\n';
        sqlDump += '-- Run: npm run db:import to import this data\n';
        sqlDump += '-- ============================================\n\n';

        sqlDump += 'USE order_system;\n\n';

        // Tắt FK check để import không bị lỗi thứ tự
        sqlDump += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

        // Truncate tất cả tables trước (theo thứ tự ngược)
        sqlDump += '-- Clear existing data\n';
        for (const table of [...tableOrder].reverse()) {
            sqlDump += `TRUNCATE TABLE ${table};\n`;
        }
        sqlDump += '\n';

        // Export data từng table
        for (const table of tableOrder) {
            console.log(`📋 Exporting table: ${table}...`);

            // Lấy tất cả rows
            const [rows] = await connection.query(`SELECT * FROM ${table}`);

            if (rows.length === 0) {
                sqlDump += `-- Table "${table}": No data\n\n`;
                console.log(`   ⏭️  ${table}: 0 rows (skipped)`);
                continue;
            }

            // Lấy tên các columns
            const columns = Object.keys(rows[0]);

            sqlDump += `-- Table: ${table} (${rows.length} rows)\n`;
            sqlDump += `INSERT INTO ${table} (${columns.map(c => '`' + c + '`').join(', ')})\nVALUES\n`;

            const valueRows = rows.map((row, index) => {
                const values = columns.map(col => {
                    const val = row[col];

                    if (val === null || val === undefined) {
                        return 'NULL';
                    }

                    // Date/DateTime handling
                    if (val instanceof Date) {
                        // Format: 'YYYY-MM-DD HH:MM:SS'
                        const yyyy = val.getFullYear();
                        const mm = String(val.getMonth() + 1).padStart(2, '0');
                        const dd = String(val.getDate()).padStart(2, '0');
                        const hh = String(val.getHours()).padStart(2, '0');
                        const mi = String(val.getMinutes()).padStart(2, '0');
                        const ss = String(val.getSeconds()).padStart(2, '0');
                        return `'${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}'`;
                    }

                    // Number handling
                    if (typeof val === 'number' || typeof val === 'bigint') {
                        return String(val);
                    }

                    // Boolean handling
                    if (typeof val === 'boolean') {
                        return val ? '1' : '0';
                    }

                    // String handling - escape quotes
                    const escaped = String(val)
                        .replace(/\\/g, '\\\\')
                        .replace(/'/g, "\\'")
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')
                        .replace(/\t/g, '\\t');
                    return `'${escaped}'`;
                });

                const isLast = index === rows.length - 1;
                return `(${values.join(', ')})${isLast ? ';' : ','}`;
            });

            sqlDump += valueRows.join('\n');
            sqlDump += '\n\n';

            console.log(`   ✅ ${table}: ${rows.length} rows exported`);
        }

        // Bật lại FK check
        sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';

        // Ghi file
        const outputPath = path.join(__dirname, '../../Database/data_dump.sql');
        fs.writeFileSync(outputPath, sqlDump, 'utf8');

        console.log('\n🎉 Export completed successfully!');
        console.log(`📁 Output file: Database/data_dump.sql`);
        console.log(`📏 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
        console.log('\n💡 Hãy commit file data_dump.sql lên git để team members có thể import.');

    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

exportData();
