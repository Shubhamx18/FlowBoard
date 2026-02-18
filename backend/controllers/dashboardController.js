const { getPool } = require('../config/db');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const pool = getPool();

        // Total projects for user
        const [projectCount] = await pool.query(`
            SELECT COUNT(*) AS count FROM project_members WHERE user_id = ?
        `, [req.user.id]);

        // Total tasks assigned to user
        const [taskStats] = await pool.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo,
                SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS review
            FROM tasks t
            JOIN project_members pm ON t.project_id = pm.project_id
            WHERE pm.user_id = ?
        `, [req.user.id]);

        // Overdue tasks
        const [overdue] = await pool.query(`
            SELECT COUNT(*) AS count
            FROM tasks t
            JOIN project_members pm ON t.project_id = pm.project_id
            WHERE pm.user_id = ? AND t.due_date < NOW() AND t.status != 'done'
        `, [req.user.id]);

        // Recent activity
        const [recentActivity] = await pool.query(`
            SELECT al.*, u.first_name, u.last_name
            FROM activity_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)
            ORDER BY al.created_at DESC
            LIMIT 10
        `, [req.user.id]);

        // Upcoming deadlines (next 7 days)
        const [upcomingTasks] = await pool.query(`
            SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name AS project_name, p.color AS project_color, p.id AS project_id
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            JOIN project_members pm ON t.project_id = pm.project_id
            WHERE pm.user_id = ? AND t.due_date IS NOT NULL
              AND t.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
              AND t.status != 'done'
            ORDER BY t.due_date ASC
            LIMIT 10
        `, [req.user.id]);

        res.json({
            projects: projectCount[0].count,
            tasks: taskStats[0],
            overdue: overdue[0].count,
            recentActivity,
            upcomingTasks
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/dashboard/notifications
const getNotifications = async (req, res) => {
    try {
        const pool = getPool();
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/dashboard/notifications/:id/read
const markNotificationRead = async (req, res) => {
    try {
        const pool = getPool();
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/dashboard/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
    try {
        const pool = getPool();
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getDashboardStats, getNotifications, markNotificationRead, markAllNotificationsRead };
