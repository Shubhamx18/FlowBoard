import { useState } from 'react';
import { projectsAPI } from '../services/api';
import { UserPlus, X, Crown, Shield, User, Trash2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function TeamPanel({ projectId, members = [], ownerId, currentUserId, onMembersChanged, onClose, onlineUsers = [] }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const isOwner = currentUserId === ownerId;

    const getStatus = (memberId) => {
        const ou = onlineUsers.find(u => u.id === memberId);
        return ou ? (ou.status || 'online') : 'offline';
    };
    const STATUS_COLORS = { online: '#22c55e', away: '#f59e0b', busy: '#ef4444', dnd: '#6b7280', offline: '#374151' };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const res = await projectsAPI.addMember(projectId, { email: email.trim() });
            setEmail('');
            showToast(`Member invited successfully!`);
            if (onMembersChanged) onMembersChanged(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to invite member', 'error');
        }
        setLoading(false);
    };

    const handleRemove = async (userId, name) => {
        if (!confirm(`Remove ${name} from this project?`)) return;
        try {
            await projectsAPI.removeMember(projectId, userId);
            showToast(`${name} removed from project`);
            if (onMembersChanged) {
                onMembersChanged(members.filter(m => m.id !== userId));
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to remove member', 'error');
        }
    };

    const roleIcon = (role) => {
        if (role === 'owner') return <Crown size={12} />;
        if (role === 'admin') return <Shield size={12} />;
        return <User size={12} />;
    };

    const roleColor = (role) => {
        if (role === 'owner') return { bg: 'rgba(251,191,36,.1)', border: 'rgba(251,191,36,.25)', color: '#fbbf24' };
        if (role === 'admin') return { bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)', color: '#a78bfa' };
        return { bg: 'rgba(255,255,255,.05)', border: 'var(--glass-border)', color: 'var(--text-muted)' };
    };

    const GRADIENT_COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];

    return (
        <div className="team-panel">
            {/* Header */}
            <div className="team-panel-header">
                <div className="flex gap-sm items-center">
                    <div style={{
                        width: 32, height: 32, borderRadius: 'var(--r-lg)',
                        background: 'var(--grad-primary)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(139,92,246,.25)',
                    }}>
                        <UserPlus size={14} color="white" />
                    </div>
                    <div>
                        <h5 style={{ fontSize: '.875rem', fontWeight: 700 }}>Team Members</h5>
                        <span className="text-xs text-muted">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={onClose}>
                    <X size={14} />
                </button>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`team-toast team-toast-${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Invite Form */}
            <div className="team-invite-section">
                <p className="text-xs text-muted font-bold" style={{
                    textTransform: 'uppercase', letterSpacing: '1px',
                    marginBottom: 'var(--sp-sm)',
                }}>
                    Invite by Email
                </p>
                <form onSubmit={handleInvite} className="team-invite-form">
                    <div className="team-invite-input-wrap">
                        <Mail size={14} className="team-invite-icon" />
                        <input
                            className="form-input team-invite-input"
                            placeholder="colleague@email.com"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                        {loading ? <div className="spinner spinner-sm" /> : <><UserPlus size={14} /> Invite</>}
                    </button>
                </form>
            </div>

            {/* Members List */}
            <div className="team-members-list">
                <p className="text-xs text-muted font-bold" style={{
                    textTransform: 'uppercase', letterSpacing: '1px',
                    marginBottom: 'var(--sp-md)', padding: '0 var(--sp-md)',
                }}>
                    Members ({members.length})
                </p>
                <div className="flex-col gap-xs" style={{ padding: '0 var(--sp-md)' }}>
                    {members.map((m, i) => {
                        const rc = roleColor(m.role);
                        const gradColor = GRADIENT_COLORS[i % GRADIENT_COLORS.length];
                        return (
                            <div key={m.id} className="team-member-card">
                                <div style={{ position: 'relative' }}>
                                    <div className="avatar avatar-sm" style={{
                                        background: `linear-gradient(135deg, ${gradColor}, ${gradColor}bb)`,
                                        fontSize: '.75rem', fontWeight: 700,
                                    }}>
                                        {m.first_name?.[0]?.toUpperCase() || m.email?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    {/* Status dot */}
                                    <div className="member-status-dot" style={{ background: STATUS_COLORS[getStatus(m.id)] }} title={getStatus(m.id)} />
                                    {m.id === ownerId && (
                                        <div style={{
                                            position: 'absolute', top: -2, right: -2,
                                            width: 14, height: 14, borderRadius: '50%',
                                            background: '#fbbf24', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            border: '2px solid var(--bg)',
                                        }}>
                                            <Crown size={7} color="#000" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm font-semibold truncate">
                                        {m.first_name} {m.last_name}
                                        {m.id === currentUserId && <span className="text-xs text-muted"> (you)</span>}
                                    </div>
                                    <div className="text-xs text-muted truncate">{m.email}</div>
                                </div>
                                <div className="flex gap-xs items-center">
                                    <span className="team-role-badge" style={{
                                        background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color,
                                    }}>
                                        {roleIcon(m.role)}
                                        {m.role}
                                    </span>
                                    {isOwner && m.id !== currentUserId && (
                                        <button
                                            className="btn-icon team-remove-btn"
                                            onClick={() => handleRemove(m.id, `${m.first_name} ${m.last_name}`)}
                                            title="Remove member"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
