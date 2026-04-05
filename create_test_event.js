const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 4000,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Checking for admin user...");
        const [users] = await db.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (users.length === 0) {
            console.log("No admin user found. Creating one...");
            await db.execute("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)", 
                ['Test Admin', 'admin@test.com', 'hashedpassword', 'admin']);
            const [[newUser]] = await db.execute("SELECT id FROM users WHERE email = 'admin@test.com'");
            users.push(newUser);
        }
        
        const adminId = users[0].id;
        console.log("Using Admin ID:", adminId);

        console.log("Inserting test event...");
        await db.execute(
            "INSERT INTO events (title, description, event_date, venue, category, created_by) VALUES (?,?,?,?,?,?)",
            ['Test Event', 'This is a test event description.', '2024-12-31 10:00:00', 'Test Venue', 'academic', adminId]
        );
        console.log("Test event inserted!");
    } finally {
        await db.end();
    }
}

run().catch(console.error);
