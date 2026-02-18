const { getPool } = require('../config/db');

// Create polls table if not exists
const ensurePollTables = async (pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS polls (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            question VARCHAR(500) NOT NULL,
            creator_id INT NOT NULL,
            is_closed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS poll_options (
            id INT PRIMARY KEY AUTO_INCREMENT,
            poll_id INT NOT NULL,
            option_text VARCHAR(300) NOT NULL,
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS poll_votes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            poll_option_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_vote (poll_option_id, user_id)
        )
    `);
};

let tablesEnsured = false;

// POST /api/polls/project/:projectId
const createPoll = async (req, res) => {
    try {
        const { question, options } = req.body;
        if (!question || !options || options.length < 2) {
            return res.status(400).json({ message: 'Question and at least 2 options required' });
        }
        const pool = getPool();
        if (!tablesEnsured) { await ensurePollTables(pool); tablesEnsured = true; }

        const [result] = await pool.query(
            'INSERT INTO polls (project_id, question, creator_id) VALUES (?, ?, ?)',
            [req.params.projectId, question, req.user.id]
        );

        for (const opt of options) {
            await pool.query('INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)', [result.insertId, opt]);
        }

        const poll = await getPollById(pool, result.insertId);

        // Emit via socket
        const io = req.app.get('io');
        if (io) io.to(`project-${req.params.projectId}`).emit('new_poll', poll);

        res.status(201).json(poll);
    } catch (error) {
        console.error('Create poll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/polls/:pollId/vote
const votePoll = async (req, res) => {
    try {
        const { optionId } = req.body;
        const pool = getPool();
        if (!tablesEnsured) { await ensurePollTables(pool); tablesEnsured = true; }

        // Remove existing vote for this poll by this user
        await pool.query(`
            DELETE pv FROM poll_votes pv
            JOIN poll_options po ON pv.poll_option_id = po.id
            WHERE po.poll_id = ? AND pv.user_id = ?
        `, [req.params.pollId, req.user.id]);

        // Insert new vote
        await pool.query('INSERT INTO poll_votes (poll_option_id, user_id) VALUES (?, ?)', [optionId, req.user.id]);

        const poll = await getPollById(pool, parseInt(req.params.pollId));

        // Emit via socket
        const [pollData] = await pool.query('SELECT project_id FROM polls WHERE id = ?', [req.params.pollId]);
        const io = req.app.get('io');
        if (io && pollData[0]) io.to(`project-${pollData[0].project_id}`).emit('poll_updated', poll);

        res.json(poll);
    } catch (error) {
        console.error('Vote poll error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/polls/project/:projectId
const getPolls = async (req, res) => {
    try {
        const pool = getPool();
        if (!tablesEnsured) { await ensurePollTables(pool); tablesEnsured = true; }

        const [polls] = await pool.query('SELECT id FROM polls WHERE project_id = ? ORDER BY created_at DESC', [req.params.projectId]);

        const fullPolls = [];
        for (const p of polls) {
            fullPolls.push(await getPollById(pool, p.id));
        }

        res.json(fullPolls);
    } catch (error) {
        console.error('Get polls error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Helper
async function getPollById(pool, pollId) {
    const [polls] = await pool.query(`
        SELECT p.*, u.first_name, u.last_name
        FROM polls p JOIN users u ON p.creator_id = u.id
        WHERE p.id = ?
    `, [pollId]);

    const [options] = await pool.query(`
        SELECT po.*, COUNT(pv.id) AS votes,
               GROUP_CONCAT(pv.user_id) AS voter_ids
        FROM poll_options po
        LEFT JOIN poll_votes pv ON po.id = pv.poll_option_id
        WHERE po.poll_id = ?
        GROUP BY po.id
    `, [pollId]);

    return { ...polls[0], options };
}

module.exports = { createPoll, votePoll, getPolls };
