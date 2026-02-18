import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { Settings, Save, Trash2, X, AlertTriangle, Check } from 'lucide-react';

export default function ProjectSettings({ project, onClose, onUpdated }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: project?.name || '',
        description: project?.description || '',
        color: project?.color || '#8b5cf6',
        status: project?.status || 'active',
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState('');
    const [toast, setToast] = useState(null);

    const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#6366f1'];

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return showToast('Project name is required', 'error');
        setSaving(true);
        try {
            await projectsAPI.update(project.id, form);
            onUpdated?.();
            showToast('Project updated successfully');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update', 'error');
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (confirmDelete !== project.name) return showToast('Type the project name to confirm', 'error');
        setDeleting(true);
        try {
            await projectsAPI.delete(project.id);
            navigate('/dashboard');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to delete', 'error');
            setDeleting(false);
        }
    };

    return (
        <div className="project-settings-panel">
            <div className="flex-between" style={{ marginBottom: 'var(--sp-lg)' }}>
                <h3 className="flex items-center gap-sm" style={{ fontSize: '1rem', fontWeight: 800 }}>
                    <Settings size={18} /> Project Settings
                </h3>
                <button className="btn-icon" onClick={onClose}><X size={16} /></button>
            </div>

            <form onSubmit={handleSave}>
                <div className="form-group">
                    <label className="form-label">Project Name *</label>
                    <input
                        className="form-input"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        className="form-textarea"
                        rows={3}
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        placeholder="What's this project about?"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                        className="form-select"
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Theme Color</label>
                    <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                        {COLORS.map(c => (
                            <div
                                key={c}
                                onClick={() => setForm({ ...form, color: c })}
                                className="pointer"
                                style={{
                                    width: 30, height: 30, borderRadius: 'var(--r-md)', background: c,
                                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                                    boxShadow: form.color === c ? `0 0 12px ${c}60` : 'none',
                                    transition: 'all .15s', transform: form.color === c ? 'scale(1.1)' : 'scale(1)',
                                }}
                            />
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            {/* Danger Zone */}
            <div className="settings-danger-zone" style={{ marginTop: 'var(--sp-2xl)' }}>
                <h4 className="flex items-center gap-xs text-sm" style={{ color: '#ef4444' }}>
                    <AlertTriangle size={14} /> Danger Zone
                </h4>
                <p className="text-xs text-muted" style={{ margin: 'var(--sp-xs) 0 var(--sp-sm)' }}>
                    This action cannot be undone. Type <strong>{project.name}</strong> to confirm.
                </p>
                <input
                    className="form-input"
                    placeholder={`Type "${project.name}" to confirm`}
                    value={confirmDelete}
                    onChange={e => setConfirmDelete(e.target.value)}
                    style={{ marginBottom: 'var(--sp-sm)', fontSize: '.8rem' }}
                />
                <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDelete}
                    disabled={confirmDelete !== project.name || deleting}
                    style={{ width: '100%' }}
                >
                    <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete Project'}
                </button>
            </div>

            {toast && (
                <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
                    {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
