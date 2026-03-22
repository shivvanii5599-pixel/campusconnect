const db = require('./db');
const bcrypt = require('bcryptjs');

async function fixAdmin() {
    try {
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);
        
        console.log(`Updating database with new hash for admin@campus.edu...`);
        const [result] = await db.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hash, 'admin@campus.edu']
        );
        
        if (result.affectedRows > 0) {
            console.log('✅ Admin password updated successfully!');
        } else {
            console.log('⚠ Admin user not found. Creating a new admin...');
            await db.query(
                "INSERT INTO users (full_name, email, password, role, department) VALUES (?, ?, ?, ?, ?)",
                ['Admin User', 'admin@campus.edu', hash, 'admin', 'Administration']
            );
            console.log('✅ Admin user created successfully!');
        }

        // Also fix the sample student
        const studentHash = await bcrypt.hash('student123', 10);
        await db.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [studentHash, 'john@student.edu']
        );
        console.log('✅ Student password updated successfully!');

    } catch (err) {
        console.error('❌ Error fixing admin:', err.message);
    } finally {
        process.exit();
    }
}

fixAdmin();
