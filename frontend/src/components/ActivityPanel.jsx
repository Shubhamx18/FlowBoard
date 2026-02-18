import { useState, useEffect } from 'react';
import { activityAPI } from '../services/api';
import { Activity, X, UserPlus, UserMinus, CheckSquare, ArrowRightLeft, Trash2, Edit3, RefreshCw } from 'lucide-react';

const ACTION_CONFIG = {
    task_created: { icon: CheckSquare, color: '#10b981', label: 'Created' },
    task_status_changed: { icon: ArrowRightLeft, color: '#8b5cf6', label: 'Moved' },
    task_deleted: { icon: Trash2, color: '#f43f5e', label: 'Deleted' },
    task_updated: { icon: Edit3, color: '#3b82f6', label: 'Updated' },
    member_added: { icon: UserPlus, color: '#fbbf24', label: 'Added' },
    member_removed: { icon: UserMinus, color: '#f87171', label: 'Removed' },
};

function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
}

export default function ActivityPanel({ projectId, onClose }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadActivities = async () => {
        try {
            const res = await activityAPI.getAll(projectId);
            setActivities(res.data);
        } catch (err) {
            console.error('Load activities error:', err);
        }
        setLoading(false);
    };

    useEffect(() => { loadActivities(); }, [projectId]);

    return (
        <div className="activity-panel">
            {/* Header */}
            <div className="activity-panel-header">
                <div className="flex gap-sm items-center">
                    <div style={{
                        width: 32, height: 32, borderRadius: 'var(--r-lg)',
                        background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(244,63,94,.25)',
                    }}>
                        <Activity size={14} color="white" />
                    </div>
                    <h5 style={{ fontSize: '.875rem', fontWeight: 700 }}>Activity</h5>
                </div>
                <div className="flex gap-xs">
                    <button
                        className="btn-icon"
                        style={{ width: 28, height: 28 }}
                        onClick={() => { setLoading(true); loadActivities(); }}
                        title="Refresh"
                    >
                        <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
                    </button>
                    <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={onClose}>
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="activity-list">
                {loading ? (
                    <div className="flex-center" style={{ padding: 'var(--sp-3xl)' }}>
                        <div className="spinner spinner-sm" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex-center flex-col gap-md" style={{ padding: 'var(--sp-3xl)', opacity: .5 }}>
                        <Activity size={32} />
                        <p className="text-sm text-muted">No activity yet</p>
                    </div>
                ) : (
                    activities.map((a, i) => {
                        const config = ACTION_CONFIG[a.action] || { icon: Edit3, color: '#94a3b8', label: a.action };
                        const Icon = config.icon;
                        return (
                            <div
                                key={a.id}
                                className="activity-item animate-card"
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <div className="activity-icon" style={{
                                    background: `${config.color}15`,
                                    border: `1px solid ${config.color}30`,
                                    color: config.color,
                                }}>
                                    <Icon size={13} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm" style={{ lineHeight: 1.4 }}>
                                        <span className="font-semibold">{a.first_name || 'System'}</span>
                                        {' '}
                                        <span className="text-muted">{a.description || a.action}</span>
                                    </div>
                                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                        {timeAgo(a.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
