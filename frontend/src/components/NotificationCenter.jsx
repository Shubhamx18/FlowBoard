import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, UserPlus, ClipboardList, FolderPlus } from 'lucide-react';
import { dashboardAPI } from '../services/api';

const ICONS = {
    task_assigned: ClipboardList,
    project_invite: FolderPlus,
    default: Bell,
};

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);
    const navigate = useNavigate();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const fetchNotifications = async () => {
        try {
            const res = await dashboardAPI.getNotifications();
            setNotifications(res.data || []);
        } catch (e) { console.error(e); }
    };

    const markRead = async (id) => {
        try {
            await dashboardAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.error(e); }
    };

    const markAllRead = async () => {
        try {
            await dashboardAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) { console.error(e); }
    };

    const handleClick = (notif) => {
        markRead(notif.id);
        if (notif.link) navigate(notif.link);
        setOpen(false);
    };

    const timeAgo = (date) => {
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    };

    return (
        <div className="notif-center" ref={panelRef}>
            <button className="btn-icon notif-bell" onClick={() => setOpen(!open)} title="Notifications">
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <h4 style={{ fontSize: '.875rem', fontWeight: 700 }}>Notifications</h4>
                        {unreadCount > 0 && (
                            <button className="btn btn-ghost btn-xs" onClick={markAllRead}>
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-dropdown-body">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <Bell size={28} style={{ opacity: .2, marginBottom: 8 }} />
                                <span className="text-muted text-xs">No notifications yet</span>
                            </div>
                        ) : (
                            notifications.slice(0, 20).map(n => {
                                const Icon = ICONS[n.type] || ICONS.default;
                                return (
                                    <div
                                        key={n.id}
                                        className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                        onClick={() => handleClick(n)}
                                    >
                                        <div className="notif-item-icon">
                                            <Icon size={14} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="text-sm font-semibold" style={{ lineHeight: 1.3 }}>{n.title}</div>
                                            <div className="text-xs text-muted" style={{ lineHeight: 1.4 }}>{n.message}</div>
                                            <div className="text-xs text-muted" style={{ marginTop: 2, opacity: .6 }}>{timeAgo(n.created_at)}</div>
                                        </div>
                                        {!n.is_read && <div className="notif-unread-dot" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
