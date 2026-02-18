const { getPool } = require('../config/db');

// GET /api/messages/project/:projectId
const getMessages = async (req, res) => {
    try {
        const pool = getPool();
        const [messages] = await pool.query(`
            SELECT m.*, u.first_name, u.last_name, u.avatar_url
            FROM messages m
            JOIN users u ON m.author_id = u.id
            WHERE m.project_id = ?
            ORDER BY m.created_at ASC
        `, [req.params.projectId]);

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/messages/project/:projectId
const sendMessage = async (req, res) => {
    try {
        const { content } = req.body;
        const pool = getPool();

        const [result] = await pool.query(
            'INSERT INTO messages (project_id, author_id, content) VALUES (?, ?, ?)',
            [req.params.projectId, req.user.id, content]
        );

        const [messages] = await pool.query(`
            SELECT m.*, u.first_name, u.last_name, u.avatar_url
            FROM messages m
            JOIN users u ON m.author_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        // Emit to everyone in the room EXCEPT the sender
        // (sender already adds message from the API response — no duplicate)
        const io = req.app.get('io');
        const senderSocketId = req.headers['x-socket-id']; // optional hint
        if (io) {
            if (senderSocketId) {
                // Exclude sender's socket specifically
                io.to(`project-${req.params.projectId}`).except(senderSocketId).emit('new-message', messages[0]);
            } else {
                // Fallback: broadcast to all — frontend deduplicates by author_id
                io.to(`project-${req.params.projectId}`).emit('new-message', messages[0]);
            }
        }

        res.status(201).json(messages[0]);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/messages/:id/pin
const pinMessage = async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('UPDATE messages SET is_pinned = TRUE WHERE id = ?', [req.params.id]);
        const [msgs] = await pool.query(`
            SELECT m.*, u.first_name, u.last_name, u.avatar_url
            FROM messages m JOIN users u ON m.author_id = u.id
            WHERE m.id = ?
        `, [req.params.id]);
        res.json(msgs[0]);
    } catch (error) {
        console.error('Pin message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/messages/:id/pin
const unpinMessage = async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('UPDATE messages SET is_pinned = FALSE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message unpinned' });
    } catch (error) {
        console.error('Unpin message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/messages/project/:projectId/pinned
const getPinnedMessages = async (req, res) => {
    try {
        const pool = getPool();
        const [messages] = await pool.query(`
            SELECT m.*, u.first_name, u.last_name, u.avatar_url
            FROM messages m JOIN users u ON m.author_id = u.id
            WHERE m.project_id = ? AND m.is_pinned = TRUE
            ORDER BY m.created_at DESC
        `, [req.params.projectId]);
        res.json(messages);
    } catch (error) {
        console.error('Get pinned messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getMessages, sendMessage, pinMessage, unpinMessage, getPinnedMessages };
