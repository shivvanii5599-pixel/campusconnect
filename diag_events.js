const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 4000,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const [users] = await connection.execute('SELECT id, full_name, role FROM users');
        console.log('Users found:', users.length);
        console.log('User IDs:', users.map(u => u.id));
        
        const [events] = await connection.execute('SELECT id, title, created_by, status, event_date FROM events');
        console.log('Events found:', events.length);
        console.log('Events:', events);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

check();
