const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function test() {
    try {
        const password = "password123";
        const email = "debug@test.com";
        const full_name = "Debug User";
        
        console.log("Checking if user exists...");
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log("User already exists, deleting...");
            await db.query('DELETE FROM users WHERE email = ?', [email]);
        }
        
        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log("Inserting user...");
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, roll_number, department, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, null, null, null]
        );
        
        console.log("Signing JWT...");
        const token = jwt.sign(
            { id: result.insertId, email, role: 'student', full_name },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '7d' }
        );
        
        console.log("Success! Token:", token);
    } catch (err) {
        console.error("Caught Error:", err);
    } finally {
        process.exit();
    }
}
test();
