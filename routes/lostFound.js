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
        cb(null, `item_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
}});

// Get all items
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, search, status } = req.query;
        let query = `SELECT l.*, u.full_name as poster_name FROM lost_found_items l JOIN users u ON l.posted_by = u.id WHERE 1=1`;
        const params = [];
        if (type) { query += ' AND l.type = ?'; params.push(type); }
        if (status) { query += ' AND l.status = ?'; params.push(status); }
        else { query += ' AND l.status = "active"'; }
        if (search) { query += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        query += ' ORDER BY l.created_at DESC';
        const [items] = await db.query(query, params);
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Post item
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { type, title, description, location, date_occurred, contact_name, contact_email, contact_phone } = req.body;
        
        if (!type || !title || !description || !date_occurred || !contact_name) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Required fields are missing.' });
        }

        const image_path = req.file ? req.file.filename : null;
        const [result] = await db.query(
            'INSERT INTO lost_found_items (type, title, description, location, image_path, date_occurred, contact_name, contact_email, contact_phone, posted_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [type, title, description, location || null, image_path, date_occurred, contact_name, contact_email || null, contact_phone || null, req.user.id]
        );
        res.json({ success: true, message: 'Item posted successfully!', id: result.insertId });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Lost & Found post error:', error);
        res.status(500).json({ success: false, message: 'Failed to post item.' });
    }
});

// Update item status
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });

        const [items] = await db.query('SELECT posted_by FROM lost_found_items WHERE id = ?', [req.params.id]);
        if (items.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });
        
        if (items[0].posted_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to update this item.' });
        }
        
        await db.query('UPDATE lost_found_items SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: `Item marked as ${status}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
});

// Delete item
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM lost_found_items WHERE id = ?', [req.params.id]);
        if (items.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });
        if (items[0].posted_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized.' });
        }
        if (items[0].image_path) {
            const filePath = path.join(__dirname, '../public/uploads/images', items[0].image_path);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await db.query('DELETE FROM lost_found_items WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Item deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
