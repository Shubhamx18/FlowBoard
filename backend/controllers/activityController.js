const { getPool } = require('../config/db');

// Reusable helper — call from other controllers to log actions
const logActivity = async (pool, { userId, projectId, action, entityType, entityId, description }) => {
    try {
        await pool.query(
            'INSERT INTO activity_log (user_id, project_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, projectId, action, entityType || null, entityId || null, description || null]
        );
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

// GET /api/activity/project/:projectId
const getActivities = async (req, res) => {
    try {
        const pool = getPool();
        const [activities] = await pool.query(`
            SELECT a.*, u.first_name, u.last_name, u.avatar_url
            FROM activity_log a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.project_id = ?
            ORDER BY a.created_at DESC
            LIMIT 50
        `, [req.params.projectId]);

        res.json(activities);
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { logActivity, getActivities };
