import { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import {
    X, MessageSquare, Send, Calendar, User, Flag, Tag, Clock,
    CheckCircle, AlertCircle, Circle, Loader
} from 'lucide-react';

const STATUS_CFG = {
    todo: { label: 'To Do', color: '#6b7280', icon: Circle },
    in_progress: { label: 'In Progress', color: '#3b82f6', icon: Loader },
    review: { label: 'Review', color: '#f59e0b', icon: AlertCircle },
    done: { label: 'Done', color: '#10b981', icon: CheckCircle },
};

const PRIORITY_CFG = {
    low: { label: 'Low', color: '#6b7280' },
    medium: { label: 'Medium', color: '#3b82f6' },
    high: { label: 'High', color: '#f59e0b' },
    urgent: { label: 'Urgent', color: '#ef4444' },
};

const LABEL_PRESETS = [
    { name: 'Bug', color: '#ef4444' },
    { name: 'Feature', color: '#8b5cf6' },
    { name: 'Design', color: '#ec4899' },
    { name: 'Backend', color: '#06b6d4' },
    { name: 'Frontend', color: '#10b981' },
    { name: 'Docs', color: '#f59e0b' },
    { name: 'Testing', color: '#6366f1' },
    { name: 'DevOps', color: '#64748b' },
];

export default function TaskDetailModal({ taskId, projectId, members = [], onClose, onTaskUpdated }) {
    const [task, setTask] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editingDesc, setEditingDesc] = useState(false);
    const [editDesc, setEditDesc] = useState('');

    useEffect(() => {
        loadTask();
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [taskId]);

    const loadTask = async () => {
        setLoading(true);
        try {
            const r = await tasksAPI.getOne(taskId);
            setTask(r.data);
            setComments(r.data.comments || []);
            setEditTitle(r.data.title);
            setEditDesc(r.data.description || '');
        } catch (e) { console.error('Load task error:', e); }
        setLoading(false);
    };

    const updateField = async (field, value) => {
        setSaving(true);
        try {
            const r = await tasksAPI.update(taskId, { [field]: value });
            setTask(prev => ({ ...prev, ...r.data }));
            onTaskUpdated?.();
        } catch (e) { console.error('Update error:', e); }
        setSaving(false);
    };

    const handleTitleSave = () => {
        if (editTitle.trim() && editTitle !== task.title) {
            updateField('title', editTitle.trim());
        }
        setEditingTitle(false);
    };

    const handleDescSave = () => {
        if (editDesc !== (task.description || '')) {
            updateField('description', editDesc);
        }
        setEditingDesc(false);
    };

    const addComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const r = await tasksAPI.addComment(taskId, { content: newComment });
            setComments(prev => [...prev, r.data]);
            setNewComment('');
        } catch (e) { console.error('Comment error:', e); }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';
    const fmtTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const getAssigneeName = () => {
        if (!task?.assigned_to) return 'Unassigned';
        const m = members.find(u => u.user_id === task.assigned_to || u.id === task.assigned_to);
        return m ? `${m.first_name || m.email}` : 'Unknown';
    };

    // Parse labels from task description metadata (stored as [labels:Bug,Feature])
    const getLabels = () => {
        if (!task?.description) return [];
        const match = task.description.match(/\[labels:(.*?)\]/);
        return match ? match[1].split(',').filter(Boolean) : [];
    };

    const toggleLabel = (labelName) => {
        const current = getLabels();
        const newLabels = current.includes(labelName)
            ? current.filter(l => l !== labelName)
            : [...current, labelName];

        const desc = task.description || '';
        const cleanDesc = desc.replace(/\[labels:.*?\]/, '').trim();
        const newDesc = newLabels.length > 0
            ? `${cleanDesc}\n[labels:${newLabels.join(',')}]`.trim()
            : cleanDesc;
        updateField('description', newDesc);
    };

    const taskLabels = task ? getLabels() : [];

    if (loading) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal task-detail-modal" onClick={e => e.stopPropagation()}>
                    <div className="flex-center" style={{ padding: 'var(--sp-3xl)' }}>
                        <div className="spinner spinner-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (!task) return null;

    const sc = STATUS_CFG[task.status] || STATUS_CFG.todo;
    const pc = PRIORITY_CFG[task.priority] || PRIORITY_CFG.medium;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal task-detail-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '95vw' }}>
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center gap-sm">
                        <span className={`badge badge-${task.status}`} style={{ fontSize: '.65rem' }}>
                            {sc.label}
                        </span>
                        <span className="text-xs text-muted">#{task.id}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                        {saving && <span className="text-xs text-muted">Saving...</span>}
                        <button className="modal-close" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="task-detail-body">
                    {/* Left: Main content */}
                    <div className="task-detail-main">
                        {/* Title */}
                        {editingTitle ? (
                            <input
                                className="form-input task-detail-title-input"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                                autoFocus
                            />
                        ) : (
                            <h2
                                className="task-detail-title"
                                onClick={() => setEditingTitle(true)}
                                title="Click to edit"
                            >
                                {task.title}
                            </h2>
                        )}

                        {/* Description */}
                        <div className="task-detail-desc-area">
                            <label className="text-xs text-muted font-semibold" style={{ marginBottom: 4, display: 'block' }}>Description</label>
                            {editingDesc ? (
                                <div>
                                    <textarea
                                        className="form-textarea"
                                        value={editDesc.replace(/\n?\[labels:.*?\]/, '')}
                                        onChange={e => {
                                            const labelsTag = editDesc.match(/\[labels:.*?\]/)?.[0] || '';
                                            setEditDesc(labelsTag ? `${e.target.value}\n${labelsTag}` : e.target.value);
                                        }}
                                        rows={4}
                                        autoFocus
                                    />
                                    <div className="flex gap-xs" style={{ marginTop: 4 }}>
                                        <button className="btn btn-primary btn-xs" onClick={handleDescSave}>Save</button>
                                        <button className="btn btn-ghost btn-xs" onClick={() => setEditingDesc(false)}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="task-detail-desc"
                                    onClick={() => setEditingDesc(true)}
                                    title="Click to edit"
                                >
                                    {(task.description || '').replace(/\n?\[labels:.*?\]/, '').trim() || 'Add a description...'}
                                </div>
                            )}
                        </div>

                        {/* Labels */}
                        <div style={{ marginTop: 'var(--sp-md)' }}>
                            <label className="text-xs text-muted font-semibold" style={{ marginBottom: 6, display: 'block' }}>
                                <Tag size={11} style={{ display: 'inline', verticalAlign: -1 }} /> Labels
                            </label>
                            <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                                {LABEL_PRESETS.map(lp => (
                                    <button
                                        key={lp.name}
                                        className={`task-label ${taskLabels.includes(lp.name) ? 'active' : ''}`}
                                        style={{
                                            '--label-color': lp.color,
                                            background: taskLabels.includes(lp.name) ? `${lp.color}20` : 'rgba(255,255,255,.04)',
                                            borderColor: taskLabels.includes(lp.name) ? lp.color : 'var(--glass-border)',
                                            color: taskLabels.includes(lp.name) ? lp.color : 'var(--text-muted)',
                                        }}
                                        onClick={() => toggleLabel(lp.name)}
                                    >
                                        {lp.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="task-detail-comments">
                            <h4 className="flex items-center gap-xs text-sm">
                                <MessageSquare size={14} /> Comments ({comments.length})
                            </h4>

                            <div className="task-comments-list">
                                {comments.length === 0 && (
                                    <p className="text-sm text-muted" style={{ padding: 'var(--sp-md) 0' }}>No comments yet</p>
                                )}
                                {comments.map(c => (
                                    <div key={c.id} className="task-comment">
                                        <div className="avatar avatar-sm" style={{ width: 26, height: 26, fontSize: '.6rem' }}>
                                            {(c.first_name || c.email || '?')[0]?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="flex items-center gap-xs">
                                                <span className="text-xs font-semibold">{c.first_name || c.email}</span>
                                                <span className="text-xs text-muted">{fmtTime(c.created_at)}</span>
                                            </div>
                                            <p className="text-sm" style={{ marginTop: 2 }}>{c.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={addComment} className="task-comment-form">
                                <input
                                    className="form-input"
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    style={{ marginBottom: 0, fontSize: '.8125rem' }}
                                />
                                <button type="submit" className="btn-icon" disabled={!newComment.trim()}
                                    style={{ background: newComment.trim() ? 'var(--grad-primary)' : undefined, color: newComment.trim() ? '#fff' : undefined, border: 'none', flexShrink: 0 }}>
                                    <Send size={14} />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="task-detail-sidebar">
                        {/* Status */}
                        <div className="task-detail-field">
                            <label className="text-xs text-muted font-semibold">Status</label>
                            <select
                                className="form-select"
                                value={task.status}
                                onChange={e => updateField('status', e.target.value)}
                                style={{ marginBottom: 0, fontSize: '.8rem' }}
                            >
                                {Object.entries(STATUS_CFG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="task-detail-field">
                            <label className="text-xs text-muted font-semibold flex items-center gap-xs"><Flag size={11} /> Priority</label>
                            <select
                                className="form-select"
                                value={task.priority}
                                onChange={e => updateField('priority', e.target.value)}
                                style={{ marginBottom: 0, fontSize: '.8rem' }}
                            >
                                {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assignee */}
                        <div className="task-detail-field">
                            <label className="text-xs text-muted font-semibold flex items-center gap-xs"><User size={11} /> Assignee</label>
                            <select
                                className="form-select"
                                value={task.assigned_to || ''}
                                onChange={e => updateField('assigned_to', e.target.value || null)}
                                style={{ marginBottom: 0, fontSize: '.8rem' }}
                            >
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.user_id || m.id} value={m.user_id || m.id}>
                                        {m.first_name || m.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Due date */}
                        <div className="task-detail-field">
                            <label className="text-xs text-muted font-semibold flex items-center gap-xs"><Calendar size={11} /> Due Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                                onChange={e => updateField('due_date', e.target.value || null)}
                                style={{ marginBottom: 0, fontSize: '.8rem' }}
                            />
                        </div>

                        {/* Created info */}
                        <div className="task-detail-meta">
                            <div className="flex items-center gap-xs text-xs text-muted">
                                <Clock size={11} /> Created {fmtDate(task.created_at)}
                            </div>
                            {task.completed_at && (
                                <div className="flex items-center gap-xs text-xs text-muted" style={{ marginTop: 4 }}>
                                    <CheckCircle size={11} color="#10b981" /> Completed {fmtDate(task.completed_at)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export label presets for use in other components
export { LABEL_PRESETS };
