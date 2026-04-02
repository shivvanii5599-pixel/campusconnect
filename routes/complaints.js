const router = require('express').Router();
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all complaints with support counts
router.get('/', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT c.*, u.full_name as submitter_name,
            (SELECT COUNT(*) FROM complaint_supports WHERE complaint_id = c.id) as support_count,
            EXISTS(SELECT 1 FROM complaint_supports WHERE complaint_id = c.id AND user_id = ?) as is_supported
            FROM complaints c
            JOIN users u ON c.submitted_by = u.id
            ORDER BY created_at DESC
        `;
        const [complaints] = await db.query(query, [req.user.id]);
        res.json({ success: true, complaints });
    } catch (error) {
        console.error('Fetch complaints error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Toggle support for a complaint
router.post('/:id/support', authMiddleware, async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.id;

        // Check if already supported
        const [existing] = await db.query(
            'SELECT id FROM complaint_supports WHERE complaint_id = ? AND user_id = ?',
            [complaintId, userId]
        );

        if (existing.length > 0) {
            // Remove support
            await db.query(
                'DELETE FROM complaint_supports WHERE complaint_id = ? AND user_id = ?',
                [complaintId, userId]
            );
            return res.json({ success: true, message: 'Support removed.', supported: false });
        } else {
            // Add support
            await db.query(
                'INSERT INTO complaint_supports (complaint_id, user_id) VALUES (?, ?)',
                [complaintId, userId]
            );
            return res.json({ success: true, message: 'Support added!', supported: true });
        }
    } catch (error) {
        console.error('Support toggle error:', error);
        res.status(500).json({ success: false, message: 'Failed to update support.' });
    }
});

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
