const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret_key', { expiresIn: '30d' });
};

// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const pool = getPool();
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
            [email, password_hash, first_name || null, last_name || null]
        );

        const user = {
            id: result.insertId,
            email,
            first_name: first_name || null,
            last_name: last_name || null,
            role: 'member'
        };

        res.status(201).json({ token: generateToken(user.id), user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const pool = getPool();
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const { password_hash, ...userData } = user;
        res.json({ token: generateToken(user.id), user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, avatar_url } = req.body;
        const pool = getPool();

        await pool.query(
            'UPDATE users SET first_name = ?, last_name = ?, avatar_url = ? WHERE id = ?',
            [first_name, last_name, avatar_url || null, req.user.id]
        );

        const [users] = await pool.query(
            'SELECT id, email, first_name, last_name, avatar_url, role FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json(users[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const pool = getPool();

        const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/auth/users
const getUsers = async (req, res) => {
    try {
        const pool = getPool();
        const [users] = await pool.query(
            'SELECT id, email, first_name, last_name, avatar_url, role FROM users WHERE is_active = TRUE'
        );
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, getMe, updateProfile, changePassword, getUsers };
