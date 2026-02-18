import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, FolderKanban, FolderOpen, Sun, Moon, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationCenter from './NotificationCenter';

const STATUS_OPTIONS = [
    { key: 'online', color: '#22c55e', label: 'Online' },
    { key: 'away', color: '#f59e0b', label: 'Away' },
    { key: 'busy', color: '#ef4444', label: 'Busy' },
    { key: 'dnd', color: '#6b7280', label: 'Do Not Disturb' },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/dashboard" className="navbar-brand">
                    <FolderKanban size={28} />
                    Luminary
                </Link>

                <div className="navbar-right">
                    <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>
                        <LayoutDashboard size={16} />
                        Dashboard
                    </Link>
                    <Link to="/projects" className={`navbar-link ${isActive('/projects') ? 'active' : ''}`}>
                        <FolderOpen size={16} />
                        Projects
                    </Link>

                    {/* Theme toggle */}
                    <button className="btn-icon" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    {/* Notifications */}
                    {user && <NotificationCenter />}

                    {user && (
                        <div className="navbar-user">
                            <div className="avatar avatar-sm" style={{ position: 'relative' }}>
                                {user.first_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                                <div className="navbar-status-dot" title="Online" />
                            </div>
                            <span className="navbar-username">{user.first_name || user.email}</span>
                            <Link to="/settings" className="btn-icon" title="Settings"><Settings size={15} /></Link>
                            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                                <LogOut size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
