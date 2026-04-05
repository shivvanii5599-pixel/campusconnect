const router = require('express').Router();
const db = require('../db');
const { adminMiddleware } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
    try {
        const [[users]] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
        const [[notes]] = await db.query("SELECT COUNT(*) as count FROM notes WHERE status = 'pending'");
        const [[complaints]] = await db.query("SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'");
        const [[events]] = await db.query("SELECT COUNT(*) as count FROM events WHERE status = 'upcoming'");
        const [[lostFound]] = await db.query("SELECT COUNT(*) as count FROM lost_found_items WHERE status = 'active'");
        const [[registrations]] = await db.query("SELECT COUNT(*) as count FROM registrations");
        
        const [recentComplaints] = await db.query(
            `SELECT c.*, u.full_name FROM complaints c JOIN users u ON c.submitted_by = u.id ORDER BY c.created_at DESC LIMIT 5`
        );
        const [recentUsers] = await db.query('SELECT id, full_name, email, department, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        
        res.json({
            success: true,
            stats: { students: users.count, pendingNotes: notes.count, pendingComplaints: complaints.count, upcomingEvents: events.count, lostFoundItems: lostFound.count, totalRegistrations: registrations.count },
            recentComplaints,
            recentUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Get all users
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT id, full_name, email, roll_number, department, phone, role, created_at FROM users WHERE 1=1';
        const params = [];
        if (search) { query += ' AND (full_name LIKE ? OR email LIKE ? OR roll_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY created_at DESC';
        const [users] = await db.query(query, params);
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Delete user
router.delete('/users/:id', adminMiddleware, async (req, res) => {
    try {
        if (req.params.id == req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Manage Notes
router.get('/notes', adminMiddleware, async (req, res) => {
    try {
        const [notes] = await db.query(`SELECT n.*, u.full_name as uploader_name FROM notes n JOIN users u ON n.uploaded_by = u.id ORDER BY n.created_at DESC`);
        res.json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch notes.' });
    }
});

router.put('/notes/:id/status', adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });
        await db.query('UPDATE notes SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Note status updated to ${status}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update note status.' });
    }
});

router.delete('/notes/:id', adminMiddleware, async (req, res) => {
    try {
        const [notes] = await db.query('SELECT file_path FROM notes WHERE id = ?', [req.params.id]);
        if (notes.length > 0) {
            const filePath = require('path').join(__dirname, '../public/uploads/notes', notes[0].file_path);
            if (require('fs').existsSync(filePath)) require('fs').unlinkSync(filePath);
        }
        await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Note deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete note.' });
    }
});

// Manage Complaints
router.get('/complaints', adminMiddleware, async (req, res) => {
    try {
        const { status, category } = req.query;
        let query = `SELECT c.*, u.full_name as student_name, u.email as student_email FROM complaints c JOIN users u ON c.submitted_by = u.id WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND c.status = ?'; params.push(status); }
        if (category) { query += ' AND c.category = ?'; params.push(category); }
        query += ' ORDER BY c.created_at DESC';
        const [complaints] = await db.query(query, params);
        res.json({ success: true, complaints });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
    }
});

router.put('/complaints/:id', adminMiddleware, async (req, res) => {
    try {
        const { status, admin_note } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });
        
        const resolved_at = status === 'resolved' ? new Date() : null;
        await db.query(
            'UPDATE complaints SET status=?, admin_note=?, resolved_at=? WHERE id=?',
            [status, admin_note || null, resolved_at, req.params.id]
        );
        res.json({ success: true, message: 'Complaint updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update complaint.' });
    }
});

// Manage Events
const multer = require('multer');
const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/images';
        if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `event_${Date.now()}${require('path').extname(file.originalname)}`);
    }
});
const upload = multer({ storage: eventStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/events', adminMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, description, event_date, venue, category, max_participants } = req.body;
        if (!title || !event_date) return res.status(400).json({ success: false, message: 'Title and event date are required.' });
        
        const image_path = req.file ? req.file.filename : null;
        let formattedDate = event_date;
        if (formattedDate && formattedDate.length === 16) {
            formattedDate += ':00';
        }
        
        const [result] = await db.query(
            'INSERT INTO events (title, description, event_date, venue, category, max_participants, image_path, created_by) VALUES (?,?,?,?,?,?,?,?)',
            [title, description, formattedDate, venue, category, parseInt(max_participants, 10) || 0, image_path, req.user.id]
        );
        console.log(`Event '${title}' created with ID: ${result.insertId} in DB: ${process.env.DB_NAME}`);
        res.json({ success: true, message: 'Event created successfully!', id: result.insertId });
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create event.' });
    }
});

router.get('/events/:id/participants', adminMiddleware, async (req, res) => {
    try {
        const [participants] = await db.query(
            `SELECT u.full_name, u.email, u.roll_number, u.department, r.registered_at FROM registrations r 
             JOIN users u ON r.student_id = u.id WHERE r.event_id = ? AND r.status = 'registered'`,
            [req.params.id]
        );
        res.json({ success: true, participants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch participants.' });
    }
});

router.put('/events/:id', adminMiddleware, async (req, res) => {
    try {
        const { title, description, event_date, venue, category, max_participants, status } = req.body;
        
        let formattedDate = event_date;
        if (formattedDate && formattedDate.length === 16) {
            formattedDate += ':00';
        }

        await db.query(
            'UPDATE events SET title=?, description=?, event_date=?, venue=?, category=?, max_participants=?, status=? WHERE id=?',
            [title, description, formattedDate, venue, category, parseInt(max_participants, 10) || 0, status, req.params.id]
        );
        res.json({ success: true, message: 'Event updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update event.' });
    }
});

router.delete('/events/:id', adminMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Event deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete event.' });
    }
});

module.exports = router;
