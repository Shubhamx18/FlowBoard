import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Plus, FolderKanban, CheckSquare, Users, X, Trash2, ArrowUpRight, Sparkles } from 'lucide-react';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', color: '#8b5cf6' });
    const navigate = useNavigate();

    useEffect(() => { loadProjects(); }, []);

    const loadProjects = async () => {
        try { const r = await projectsAPI.getAll(); setProjects(r.data); } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await projectsAPI.create(form);
            setShowModal(false);
            setForm({ name: '', description: '', color: '#8b5cf6' });
            loadProjects();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (ev, id) => {
        ev.stopPropagation();
        if (!confirm('Delete this project and all its data?')) return;
        try { await projectsAPI.delete(id); loadProjects(); } catch (e) { console.error(e); }
    };

    const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

    return (
        <>
            <Navbar />
            <div className="app-layout">
                <Sidebar projects={projects} onCreateProject={() => setShowModal(true)} />
                <main className="main-content">
                    {loading ? (
                        <div className="loading-screen"><div className="spinner spinner-lg" /></div>
                    ) : (
                        <>
                            <div className="section-header animate-slide-up">
                                <div>
                                    <h2 className="section-title">All Projects</h2>
                                    <p className="section-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    <Plus size={16} /> New Project
                                </button>
                            </div>

                            {projects.length > 0 ? (
                                <div className="projects-grid">
                                    {projects.map((p, i) => {
                                        const done = p.completed_tasks || 0;
                                        const total = p.task_count || 0;
                                        const pct = total ? Math.round((done / total) * 100) : 0;
                                        return (
                                            <div key={p.id} className="project-card animate-card" style={{ animationDelay: `${i * 60}ms` }}
                                                onClick={() => navigate(`/projects/${p.id}`)}>
                                                <div className="project-card-header">
                                                    <div className="project-card-icon" style={{ background: `${p.color || '#8b5cf6'}15`, color: p.color || '#8b5cf6' }}>
                                                        <FolderKanban size={20} />
                                                    </div>
                                                    <div className="flex gap-sm items-center">
                                                        <span className={`badge badge-${p.status || 'active'}`}>{p.status || 'active'}</span>
                                                        <button className="btn-icon" style={{ width: 26, height: 26, opacity: .5 }} onClick={(ev) => handleDelete(ev, p.id)}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h4 className="project-card-name">{p.name}</h4>
                                                <p className="project-card-desc">{p.description || 'No description added'}</p>
                                                <div className="project-card-progress">
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${pct}%`, background: p.color ? `linear-gradient(90deg, ${p.color}, ${p.color}cc)` : undefined }} />
                                                    </div>
                                                    <div className="progress-text">{pct}% · {done}/{total} tasks</div>
                                                </div>
                                                <div className="project-card-footer">
                                                    <div className="project-card-stats">
                                                        <span><CheckSquare size={12} /> {total} tasks</span>
                                                        <span><Users size={12} /> {p.member_count || 1}</span>
                                                    </div>
                                                    <ArrowUpRight size={14} className="text-muted" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state animate-slide-up">
                                    <Sparkles size={64} color="var(--violet-400)" style={{ opacity: .4 }} />
                                    <h3>No projects yet</h3>
                                    <p>Create your first project to get started</p>
                                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                        <Plus size={16} /> Create Project
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Project</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Project Name *</label>
                                    <input className="form-input" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" placeholder="What's this project about?" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Theme Color</label>
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        {COLORS.map(c => (
                                            <div key={c} onClick={() => setForm({ ...form, color: c })} className="pointer" style={{
                                                width: 36, height: 36, borderRadius: 'var(--r-lg)', background: c,
                                                border: form.color === c ? '2px solid white' : '2px solid transparent',
                                                boxShadow: form.color === c ? `0 0 16px ${c}60` : 'none',
                                                transition: 'all .2s', transform: form.color === c ? 'scale(1.1)' : 'scale(1)',
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
