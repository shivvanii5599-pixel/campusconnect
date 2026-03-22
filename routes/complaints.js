const router = require('express').Router();
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get my complaints
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const [complaints] = await db.query('SELECT * FROM complaints WHERE submitted_by = ? ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, complaints });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Submit complaint
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, category, description, priority } = req.body;
        if (!title || !category || !description) {
            return res.status(400).json({ success: false, message: 'Please provide a title, category, and description for your complaint.' });
        }
        
        const validCategories = ['hostel', 'academic', 'infrastructure', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: 'Invalid complaint category.' });
        }

        const [result] = await db.query(
            'INSERT INTO complaints (title, category, description, priority, submitted_by) VALUES (?,?,?,?,?)',
            [title, category, description, priority || 'medium', req.user.id]
        );
        res.json({ success: true, message: 'Complaint submitted successfully! An administrator will review it soon.', id: result.insertId });
    } catch (error) {
        console.error('Complaint submission error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
    }
});


module.exports = router;

module.exports = router;
