const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function initDB() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 3306,
        multipleStatements: true,
        ssl: {
            rejectUnauthorized: false
        }
    };

    try {
        console.log('Connecting to MySQL...');
        const connection = await mysql.createConnection(config);
        console.log('✔ Connected to MySQL server.');

        const dbName = process.env.DB_NAME || 'campus_connect';
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        await connection.query(`USE ${dbName}`);
        console.log(`✔ Database "${dbName}" ensured.`);

        console.log('Reading schema.sql...');
        const schema = fs.readFileSync('schema.sql', 'utf8');
        await connection.query(schema);
        console.log('✔ Schema and seed data imported successfully!');

        await connection.end();
        console.log('\n🚀 Database setup complete! You can now run "npm run dev" to start the platform.');
    } catch (error) {
        console.error('\n✖ Database setup failed!');
        console.error('Error:', error.message);
        console.log('\n💡 Tip: Make sure your MySQL server is running and your .env credentials are correct.');
        process.exit(1);
    }
}

initDB();
