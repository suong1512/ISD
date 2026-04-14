const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function seed() {
    try {
        console.log('🌱 Starting Database Seeding...');

        // Đường dẫn tới file seed.sql
        const seedPath = path.join(__dirname, '../../Database/seed.sql');
        
        if (!fs.existsSync(seedPath)) {
            throw new Error(`Seed file not found at: ${seedPath}`);
        }

        const sql = fs.readFileSync(seedPath, 'utf8');

        console.log('⏳ Executing seed.sql...');
        await pool.query(sql);
        
        console.log('✅ Seeding completed successfully!');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
    } finally {
        process.exit();
    }
}

seed();
