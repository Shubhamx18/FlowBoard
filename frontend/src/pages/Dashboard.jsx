import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, dashboardAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import {
    Plus, FolderKanban, CheckSquare, TrendingUp, AlertTriangle,
    X, Sparkles, ArrowUpRight, Clock, Activity, Calendar
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', color: '#8b5cf6' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [s, p] = await Promise.all([dashboardAPI.getStats(), projectsAPI.getAll()]);
            setStats(s.data);
            setProjects(p.data);
        } catch (e) { console.error('Dashboard load:', e); }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await projectsAPI.create(form);
            setShowModal(false);
            setForm({ name: '', description: '', color: '#8b5cf6' });
            loadData();
        } catch (e) { console.error(e); }
    };

    const totalTasks = stats?.tasks?.total_tasks || 0;
    const doneTasks = stats?.tasks?.done || 0;
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const greet = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    };

    const STAT_CARDS = [
        { label: 'Projects', value: stats?.projects?.total_projects || 0, icon: FolderKanban, color: '#a78bfa', glow: 'rgba(139,92,246,.06)' },
        { label: 'Total Tasks', value: totalTasks, icon: CheckSquare, color: '#34d399', glow: 'rgba(16,185,129,.06)' },
        { label: 'Completion', value: `${pct}%`, icon: TrendingUp, color: '#fb7185', glow: 'rgba(244,63,94,.06)' },
        { label: 'Overdue', value: stats?.tasks?.overdue || 0, icon: AlertTriangle, color: '#f87171', glow: 'rgba(239,68,68,.06)' },
    ];

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
                            {/* Greeting */}
                            <div style={{ marginBottom: 'var(--sp-2xl)' }} className="animate-slide-up">
                                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 4 }}>
                                    {greet()}, <span className="gradient-text">{user?.first_name || 'there'}</span> 👋
                                </h1>
                                <p className="text-muted text-sm">Here's an overview of your workspace</p>
                            </div>

                            {/* Stats */}
                            <div className="stats-grid" style={{ marginBottom: 'var(--sp-2xl)' }}>
                                {STAT_CARDS.map((s, i) => (
                                    <div
                                        key={s.label}
                                        className="stat-card animate-card"
                                        style={{ '--stat-glow': s.glow, animationDelay: `${i * 80}ms` }}
                                    >
                                        <div className="stat-icon" style={{ background: `${s.color}15` }}>
                                            <s.icon size={22} color={s.color} />
                                        </div>
                                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                        <div className="stat-label">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Projects */}
                            <div className="section-header">
                                <div>
                                    <h2 className="section-title">Your Projects</h2>
                                    <p className="section-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
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
                                        const prog = total ? Math.round((done / total) * 100) : 0;
                                        return (
                                            <div
                                                key={p.id}
                                                className="project-card animate-card"
                                                style={{ animationDelay: `${i * 60}ms` }}
                                                onClick={() => navigate(`/projects/${p.id}`)}
                                            >
                                                <div className="project-card-header">
                                                    <div className="project-card-icon" style={{ background: `${p.color || '#8b5cf6'}15`, color: p.color || '#8b5cf6' }}>
                                                        <FolderKanban size={20} />
                                                    </div>
                                                    <div className="flex gap-sm items-center">
                                                        <span className={`badge badge-${p.status || 'active'}`}>{p.status || 'active'}</span>
                                                        <ArrowUpRight size={14} className="text-muted" />
                                                    </div>
                                                </div>
                                                <h4 className="project-card-name">{p.name}</h4>
                                                <p className="project-card-desc">{p.description || 'No description added'}</p>
                                                <div className="project-card-progress">
                                                    <div className="progress-bar">
                                                        <div className="progress-fill" style={{ width: `${prog}%`, background: p.color ? `linear-gradient(90deg, ${p.color}, ${p.color}cc)` : undefined }} />
                                                    </div>
                                                    <div className="progress-text">{prog}% · {done}/{total} tasks</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state animate-slide-up">
                                    <div className="empty-state-icon">
                                        <Sparkles size={64} color="var(--violet-400)" style={{ opacity: .5 }} />
                                    </div>
                                    <h3>Ready to build something amazing?</h3>
                                    <p>Create your first project to get started with Luminary</p>
                                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                        <Plus size={16} /> Create Your First Project
                                    </button>
                                </div>
                            )}

                            {/* Bottom row: Upcoming Deadlines + Recent Activity */}
                            <div className="dashboard-bottom-row" style={{ marginTop: 'var(--sp-2xl)' }}>
                                {/* Upcoming Deadlines */}
                                <div className="dashboard-card">
                                    <h3 className="section-title flex items-center gap-sm" style={{ fontSize: '.95rem' }}>
                                        <Clock size={16} color="#f59e0b" /> Upcoming Deadlines
                                    </h3>
                                    <p className="section-subtitle">Tasks due in the next 7 days</p>
                                    {stats?.upcomingTasks?.length > 0 ? (
                                        <div className="deadline-list">
                                            {stats.upcomingTasks.map(t => {
                                                const dueDate = new Date(t.due_date);
                                                const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                                                const urgent = daysLeft <= 1;
                                                return (
                                                    <div key={t.id} className="deadline-item" onClick={() => navigate(`/projects/${t.project_id}`)}>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="text-sm font-semibold">{t.title}</div>
                                                            <div className="text-xs text-muted flex items-center gap-xs" style={{ marginTop: 2 }}>
                                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.project_color || '#8b5cf6' }} />
                                                                {t.project_name}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xs font-semibold ${urgent ? 'text-danger' : ''}`}>
                                                                {daysLeft <= 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                                                            </div>
                                                            <div className="text-xs text-muted">{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted" style={{ padding: 'var(--sp-lg) 0', opacity: .5 }}>🎉 No upcoming deadlines!</p>
                                    )}
                                </div>

                                {/* Recent Activity */}
                                <div className="dashboard-card">
                                    <h3 className="section-title flex items-center gap-sm" style={{ fontSize: '.95rem' }}>
                                        <Activity size={16} color="#8b5cf6" /> Recent Activity
                                    </h3>
                                    <p className="section-subtitle">What's been happening</p>
                                    {stats?.recentActivity?.length > 0 ? (
                                        <div className="activity-timeline">
                                            {stats.recentActivity.slice(0, 8).map((a, i) => (
                                                <div key={a.id || i} className="activity-timeline-item">
                                                    <div className="activity-timeline-dot" />
                                                    <div style={{ flex: 1 }}>
                                                        <div className="text-sm">
                                                            <span className="font-semibold">{a.first_name || 'User'}</span>{' '}
                                                            <span className="text-muted">{a.description || a.action}</span>
                                                        </div>
                                                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                                            {new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted" style={{ padding: 'var(--sp-lg) 0', opacity: .5 }}>No recent activity</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Create Project Modal */}
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
                                            <div
                                                key={c}
                                                onClick={() => setForm({ ...form, color: c })}
                                                className="pointer"
                                                style={{
                                                    width: 36, height: 36, borderRadius: 'var(--r-lg)', background: c,
                                                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                                                    boxShadow: form.color === c ? `0 0 16px ${c}60` : 'none',
                                                    transition: 'all .2s ease',
                                                    transform: form.color === c ? 'scale(1.1)' : 'scale(1)',
                                                }}
                                            />
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
