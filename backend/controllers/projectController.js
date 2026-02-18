const { getPool } = require('../config/db');
const { logActivity } = require('./activityController');

// GET /api/projects
const getProjects = async (req, res) => {
    try {
        const pool = getPool();
        const [projects] = await pool.query(`
            SELECT p.*, 
                   u.first_name AS owner_first_name, u.last_name AS owner_last_name,
                   (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS completed_tasks
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            JOIN project_members pm ON pm.project_id = p.id
            WHERE pm.user_id = ?
            ORDER BY p.updated_at DESC
        `, [req.user.id]);

        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/projects
const createProject = async (req, res) => {
    try {
        const { name, description, color, due_date } = req.body;
        const pool = getPool();

        const [result] = await pool.query(
            'INSERT INTO projects (name, description, color, owner_id, due_date) VALUES (?, ?, ?, ?, ?)',
            [name, description || null, color || '#7c3aed', req.user.id, due_date || null]
        );

        // Add owner as project member
        await pool.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            [result.insertId, req.user.id, 'owner']
        );

        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
        res.status(201).json(projects[0]);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/projects/:id
const getProject = async (req, res) => {
    try {
        const pool = getPool();
        const [projects] = await pool.query(`
            SELECT p.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (projects.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const [members] = await pool.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, pm.role
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        `, [req.params.id]);

        res.json({ ...projects[0], members });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
    try {
        const { name, description, color, status, due_date } = req.body;
        const pool = getPool();

        await pool.query(
            'UPDATE projects SET name = ?, description = ?, color = ?, status = ?, due_date = ? WHERE id = ?',
            [name, description, color, status, due_date || null, req.params.id]
        );

        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        res.json(projects[0]);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
    try {
        const pool = getPool();
        await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
        res.json({ message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/projects/:id/members
const addMember = async (req, res) => {
    try {
        const { email, role } = req.body;
        const pool = getPool();

        // Find user by email
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found with this email' });
        }

        const userId = users[0].id;

        await pool.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
            [req.params.id, userId, role || 'member', role || 'member']
        );

        // Log activity
        const [addedUser] = await pool.query('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
        await logActivity(pool, {
            userId: req.user.id,
            projectId: parseInt(req.params.id),
            action: 'member_added',
            entityType: 'member',
            entityId: userId,
            description: `added ${addedUser[0]?.first_name || email} to the project`
        });

        // Create notification for added user
        if (userId !== req.user.id) {
            try {
                const [proj] = await pool.query('SELECT name FROM projects WHERE id = ?', [req.params.id]);
                await pool.query(
                    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
                    [userId, 'project_invite', 'Added to Project', `You were added to "${proj[0]?.name}" by ${req.user.first_name}`, `/projects/${req.params.id}`]
                );
                const io = req.app.get('io');
                if (io) io.emit('new_notification', { userId });
            } catch (e) { console.error('Notification error:', e.message); }
        }

        const [members] = await pool.query(`
            SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, pm.role
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        `, [req.params.id]);

        res.json(members);
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res) => {
    try {
        const pool = getPool();

        // Check if the current user is the project owner
        const [projects] = await pool.query(
            'SELECT owner_id FROM projects WHERE id = ?',
            [req.params.id]
        );

        if (projects.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const project = projects[0];

        // Only project owners can remove members
        if (project.owner_id !== req.user.id) {
            return res.status(403).json({ message: 'Only project owners can remove members' });
        }

        // Prevent owners from removing themselves
        if (parseInt(req.params.userId) === req.user.id) {
            return res.status(400).json({ message: 'Cannot remove yourself from the project' });
        }

        // Get removed user's name for activity log
        const [removedUser] = await pool.query('SELECT first_name, last_name FROM users WHERE id = ?', [req.params.userId]);

        await pool.query(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [req.params.id, req.params.userId]
        );

        // Log activity
        await logActivity(pool, {
            userId: req.user.id,
            projectId: parseInt(req.params.id),
            action: 'member_removed',
            entityType: 'member',
            entityId: parseInt(req.params.userId),
            description: `removed ${removedUser[0]?.first_name || 'a member'} from the project`
        });

        res.json({ message: 'Member removed' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };
