const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const jwt = require('jsonwebtoken');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads/notes';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `note_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files allowed'));
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, search, department } = req.query;
        let query = `SELECT n.*, u.full_name as uploader_name FROM notes n 
                     JOIN users u ON n.uploaded_by = u.id WHERE n.status = 'approved'`;
        const params = [];
        if (subject) { query += ' AND n.subject = ?'; params.push(subject); }
        if (department) { query += ' AND n.department = ?'; params.push(department); }
        if (search) {
            query += ' AND (n.title LIKE ? OR n.subject LIKE ? OR n.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY n.created_at DESC';
        const [notes] = await db.query(query, params);
        res.json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Please select a PDF file to upload.' });
        
        const { title, subject, department, semester, description } = req.body;
        
        if (!title || !subject) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'Title and subject are required.' });
        }

        const [result] = await db.query(
            'INSERT INTO notes (title, subject, department, semester, description, file_path, file_size, uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
            [title, subject, department || null, semester || null, description || null, req.file.filename, req.file.size, req.user.id]
        );
        res.json({ success: true, message: 'Note uploaded successfully! It will be visible after admin approval.', id: result.insertId });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Note upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload note.' });
    }
});

// Supports token via query param for direct browser file downloads
router.get('/download/:id', async (req, res) => {
    try {
        const token = req.cookies?.token
            || req.headers.authorization?.split(' ')[1]
            || req.query.token;
        if (!token) return res.status(401).json({ success: false, message: 'Unauthorized.' });
        jwt.verify(token, process.env.JWT_SECRET || 'campus_connect_secret');
        const [notes] = await db.query('SELECT * FROM notes WHERE id = ? AND status = "approved"', [req.params.id]);
        if (notes.length === 0) return res.status(404).json({ success: false, message: 'Note not found.' });
        await db.query('UPDATE notes SET download_count = download_count + 1 WHERE id = ?', [req.params.id]);
        const filePath = path.join(__dirname, '../public/uploads/notes', notes[0].file_path);
        if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing on server.' });
        res.download(filePath, notes[0].title + '.pdf');
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token.' });
    }
});

router.get('/my-notes', authMiddleware, async (req, res) => {
    try {
        const [notes] = await db.query('SELECT * FROM notes WHERE uploaded_by = ? ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, notes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


module.exports = router;
