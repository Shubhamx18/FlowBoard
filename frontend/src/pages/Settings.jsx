import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import Navbar from '../components/Navbar';
import {
    User, Lock, Palette, Shield, Save, Eye, EyeOff, Check,
    AlertTriangle, Sun, Moon, Bell, ArrowLeft, Mail, Calendar
} from 'lucide-react';

export default function Settings() {
    const { user, updateUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('profile');
    const [toast, setToast] = useState(null);

    // Profile
    const [profile, setProfile] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);

    // Password
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [pwdLoading, setPwdLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const r = await authAPI.updateProfile(profile);
            updateUser(r.data);
            showToast('Profile updated successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update profile', 'error');
        }
        setProfileLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return showToast('Passwords do not match', 'error');
        }
        if (passwords.newPassword.length < 6) {
            return showToast('Password must be at least 6 characters', 'error');
        }
        setPwdLoading(true);
        try {
            await authAPI.changePassword({
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
            });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showToast('Password changed successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to change password', 'error');
        }
        setPwdLoading(false);
    };

    const TABS = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'preferences', label: 'Preferences', icon: Palette },
    ];

    const initial = (user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

    return (
        <>
            <Navbar />
            <div className="app-layout">
                <div className="main-content" style={{ maxWidth: 880, margin: '0 auto', padding: 'var(--sp-xl)' }}>
                    {/* Header */}
                    <div className="flex items-center gap-md" style={{ marginBottom: 'var(--sp-2xl)' }}>
                        <button className="btn-icon" onClick={() => navigate(-1)} title="Go back">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Settings</h1>
                            <p className="text-muted text-sm">Manage your account and preferences</p>
                        </div>
                    </div>

                    <div className="settings-layout">
                        {/* Tabs sidebar */}
                        <div className="settings-tabs">
                            {TABS.map(t => (
                                <button
                                    key={t.id}
                                    className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(t.id)}
                                >
                                    <t.icon size={16} />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="settings-content">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="settings-section animate-slide-up">
                                    <div className="settings-section-header">
                                        <h3>Profile Information</h3>
                                        <p className="text-muted text-sm">Update your personal details</p>
                                    </div>

                                    {/* Avatar preview */}
                                    <div className="settings-avatar-area">
                                        <div className="settings-avatar">
                                            {initial}
                                        </div>
                                        <div>
                                            <h4>{user?.first_name} {user?.last_name}</h4>
                                            <p className="text-muted text-sm flex items-center gap-xs">
                                                <Mail size={12} /> {user?.email}
                                            </p>
                                            <p className="text-muted text-xs flex items-center gap-xs" style={{ marginTop: 4 }}>
                                                <Calendar size={11} /> Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleProfileSave}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">First Name</label>
                                                <input
                                                    className="form-input"
                                                    value={profile.first_name}
                                                    onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                                    placeholder="Your first name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Last Name</label>
                                                <input
                                                    className="form-input"
                                                    value={profile.last_name}
                                                    onChange={e => setProfile({ ...profile, last_name: e.target.value })}
                                                    placeholder="Your last name"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Email</label>
                                            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: .6 }} />
                                            <span className="text-xs text-muted">Email cannot be changed</span>
                                        </div>
                                        <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                                            <Save size={15} /> {profileLoading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="settings-section animate-slide-up">
                                    <div className="settings-section-header">
                                        <h3>Change Password</h3>
                                        <p className="text-muted text-sm">Update your account password</p>
                                    </div>

                                    <form onSubmit={handlePasswordChange}>
                                        {['current', 'new', 'confirm'].map(key => {
                                            const field = key === 'current' ? 'currentPassword' : key === 'new' ? 'newPassword' : 'confirmPassword';
                                            const label = key === 'current' ? 'Current Password' : key === 'new' ? 'New Password' : 'Confirm New Password';
                                            return (
                                                <div className="form-group" key={key}>
                                                    <label className="form-label">{label}</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            className="form-input"
                                                            type={showPasswords[key] ? 'text' : 'password'}
                                                            value={passwords[field]}
                                                            onChange={e => setPasswords({ ...passwords, [field]: e.target.value })}
                                                            placeholder={`Enter ${label.toLowerCase()}`}
                                                            required
                                                            style={{ paddingRight: 40 }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn-icon"
                                                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}
                                                            onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                                                        >
                                                            {showPasswords[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
                                            <Shield size={15} /> {pwdLoading ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </form>

                                    <div className="settings-danger-zone" style={{ marginTop: 'var(--sp-2xl)' }}>
                                        <h4 className="flex items-center gap-xs"><AlertTriangle size={15} color="#ef4444" /> Danger Zone</h4>
                                        <p className="text-sm text-muted" style={{ margin: 'var(--sp-xs) 0 var(--sp-md)' }}>
                                            Signing out will end your current session.
                                        </p>
                                        <button className="btn btn-danger btn-sm" onClick={() => { logout(); navigate('/login'); }}>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preferences Tab */}
                            {activeTab === 'preferences' && (
                                <div className="settings-section animate-slide-up">
                                    <div className="settings-section-header">
                                        <h3>Preferences</h3>
                                        <p className="text-muted text-sm">Customize your experience</p>
                                    </div>

                                    <div className="settings-pref-row">
                                        <div className="flex items-center gap-md">
                                            <div className="settings-pref-icon" style={{ background: 'rgba(139,92,246,.1)' }}>
                                                {theme === 'dark' ? <Moon size={18} color="#a78bfa" /> : <Sun size={18} color="#f59e0b" />}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold">Appearance</h4>
                                                <p className="text-xs text-muted">Currently using {theme} mode</p>
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
                                            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
                                        </button>
                                    </div>

                                    <div className="settings-pref-row">
                                        <div className="flex items-center gap-md">
                                            <div className="settings-pref-icon" style={{ background: 'rgba(16,185,129,.1)' }}>
                                                <Bell size={18} color="#34d399" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold">Notifications</h4>
                                                <p className="text-xs text-muted">In-app notifications are enabled</p>
                                            </div>
                                        </div>
                                        <span className="badge badge-active" style={{ fontSize: '.65rem' }}>Enabled</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
                    {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}
        </>
    );
}
