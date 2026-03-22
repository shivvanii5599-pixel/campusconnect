const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, roll_number, department, phone } = req.body;
        
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }
        
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email is already registered.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, roll_number, department, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, roll_number || null, department || null, phone || null]
        );
        
        const token = jwt.sign(
            { id: result.insertId, email, role: 'student', full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        
        res.json({ 
            success: true, 
            message: 'Registration successful!', 
            token, 
            user: { id: result.insertId, full_name, email, role: 'student' } 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Something went wrong during registration.',
            debug: error.message 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        
        res.json({
            success: true,
            message: 'Logged in successfully!',
            token,
            user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, department: user.department }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Something went wrong during login.',
            debug: error.message
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, full_name, email, roll_number, department, phone, role, avatar, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user: users[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not fetch profile.' });
    }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { full_name, roll_number, department, phone } = req.body;
        if (!full_name) return res.status(400).json({ success: false, message: 'Name is required.' });
        
        await db.query(
            'UPDATE users SET full_name=?, roll_number=?, department=?, phone=? WHERE id=?',
            [full_name, roll_number, department, phone, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update failed.' });
    }
});

module.exports = router;
