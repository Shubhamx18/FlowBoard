const { getPool } = require('../config/db');
const { logActivity } = require('./activityController');

// GET /api/tasks/project/:projectId
const getTasks = async (req, res) => {
    try {
        const pool = getPool();
        const [tasks] = await pool.query(`
            SELECT t.*,
                   u.first_name AS assigned_first_name, u.last_name AS assigned_last_name,
                   c.first_name AS creator_first_name, c.last_name AS creator_last_name,
                   (SELECT COUNT(*) FROM comments cm WHERE cm.task_id = t.id) AS comment_count
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            JOIN users c ON t.created_by = c.id
            WHERE t.project_id = ?
            ORDER BY t.created_at DESC
        `, [req.params.projectId]);

        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/tasks/project/:projectId
const createTask = async (req, res) => {
    try {
        const { title, description, status, priority, assigned_to, due_date } = req.body;
        const pool = getPool();

        const [result] = await pool.query(
            'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.params.projectId, title, description || null, status || 'todo', priority || 'medium', assigned_to || null, due_date || null, req.user.id]
        );

        const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

        // Log activity
        await logActivity(pool, {
            userId: req.user.id,
            projectId: parseInt(req.params.projectId),
            action: 'task_created',
            entityType: 'task',
            entityId: result.insertId,
            description: `created task "${title}"`
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) io.to(`project-${req.params.projectId}`).emit('task-created', tasks[0]);

        // Create notification for assigned user
        if (assigned_to && assigned_to !== req.user.id) {
            try {
                await pool.query(
                    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
                    [assigned_to, 'task_assigned', 'New Task Assigned', `"${title}" was assigned to you by ${req.user.first_name}`, `/projects/${req.params.projectId}`]
                );
                // Emit real-time notification
                if (io) io.emit('new_notification', { userId: assigned_to });
            } catch (e) { console.error('Notification error:', e.message); }
        }

        res.status(201).json(tasks[0]);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
    try {
        const pool = getPool();
        const [tasks] = await pool.query(`
            SELECT t.*,
                   u.first_name AS assigned_first_name, u.last_name AS assigned_last_name,
                   c.first_name AS creator_first_name, c.last_name AS creator_last_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            JOIN users c ON t.created_by = c.id
            WHERE t.id = ?
        `, [req.params.id]);

        if (tasks.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Get comments
        const [comments] = await pool.query(`
            SELECT cm.*, u.first_name, u.last_name, u.avatar_url
            FROM comments cm
            JOIN users u ON cm.author_id = u.id
            WHERE cm.task_id = ?
            ORDER BY cm.created_at ASC
        `, [req.params.id]);

        res.json({ ...tasks[0], comments });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
    try {
        const { title, description, status, priority, assigned_to, due_date } = req.body;
        const pool = getPool();

        // Get old task for comparison
        const [oldTasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        const oldTask = oldTasks[0];

        const completed_at = status === 'done' ? new Date() : null;

        await pool.query(
            'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, completed_at = ? WHERE id = ?',
            [title, description, status, priority, assigned_to || null, due_date || null, completed_at, req.params.id]
        );

        const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

        // Log activity for status changes
        if (oldTask && oldTask.status !== status) {
            await logActivity(pool, {
                userId: req.user.id,
                projectId: oldTask.project_id,
                action: 'task_status_changed',
                entityType: 'task',
                entityId: parseInt(req.params.id),
                description: `moved "${title}" from ${oldTask.status} to ${status}`
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        if (io && tasks[0]) io.to(`project-${tasks[0].project_id}`).emit('task-updated', tasks[0]);

        // Notify if assigned_to changed to a different user
        if (assigned_to && assigned_to !== req.user.id && (!oldTask || oldTask.assigned_to !== parseInt(assigned_to))) {
            try {
                await pool.query(
                    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
                    [assigned_to, 'task_assigned', 'Task Assigned', `"${title}" was assigned to you by ${req.user.first_name}`, `/projects/${tasks[0]?.project_id}`]
                );
                if (io) io.emit('new_notification', { userId: parseInt(assigned_to) });
            } catch (e) { console.error('Notification error:', e.message); }
        }

        res.json(tasks[0]);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
    try {
        const pool = getPool();

        // Get task for socket event before deleting
        const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

        await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);

        // Log activity
        if (tasks[0]) {
            await logActivity(pool, {
                userId: req.user.id,
                projectId: tasks[0].project_id,
                action: 'task_deleted',
                entityType: 'task',
                entityId: parseInt(req.params.id),
                description: `deleted task "${tasks[0].title}"`
            });
        }

        // Emit socket event
        const io = req.app.get('io');
        if (io && tasks[0]) io.to(`project-${tasks[0].project_id}`).emit('task-deleted', { id: parseInt(req.params.id) });

        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/tasks/:id/comments
const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const pool = getPool();

        const [result] = await pool.query(
            'INSERT INTO comments (task_id, author_id, content) VALUES (?, ?, ?)',
            [req.params.id, req.user.id, content]
        );

        const [comments] = await pool.query(`
            SELECT cm.*, u.first_name, u.last_name, u.avatar_url
            FROM comments cm
            JOIN users u ON cm.author_id = u.id
            WHERE cm.id = ?
        `, [result.insertId]);

        res.status(201).json(comments[0]);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, addComment };
