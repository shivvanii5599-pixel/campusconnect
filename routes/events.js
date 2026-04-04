const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/images';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `event_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get all events
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = `SELECT e.*, COALESCE(u.full_name, 'Campus Admin') as organizer,
                     (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status='registered') as registered_count
                     FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.status != 'cancelled'`;
        const params = [];
        if (category) { query += ' AND e.category = ?'; params.push(category); }
        if (search) { query += ' AND (e.title LIKE ? OR e.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        query += ' ORDER BY e.event_date ASC';
        const [events] = await db.query(query, params);
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Register for event
router.post('/:id/register', authMiddleware, async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found.' });
        
        const event = events[0];
        
        // Check if event date has passed
        if (new Date(event.event_date) < new Date()) {
            return res.status(400).json({ success: false, message: 'This event has already taken place.' });
        }

        if (event.max_participants > 0) {
            const [[count]] = await db.query("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'", [req.params.id]);
            if (count.c >= event.max_participants) {
                return res.status(400).json({ success: false, message: 'Sorry, this event is already full.' });
            }
        }
        
        await db.query('INSERT INTO registrations (event_id, student_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = "registered"', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'You have successfully registered for the event!' });
    } catch (error) {
        console.error('Event registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to register for event.' });
    }
});

// Get my registrations
router.get('/my-registrations', authMiddleware, async (req, res) => {
    try {
        const [events] = await db.query(
            `SELECT e.*, r.registered_at, r.status as reg_status FROM events e 
             JOIN registrations r ON e.id = r.event_id WHERE r.student_id = ? ORDER BY e.event_date ASC`,
            [req.user.id]
        );
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


module.exports = router;
