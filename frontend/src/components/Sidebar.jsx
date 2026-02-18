import { Link, useLocation } from 'react-router-dom';
import { Plus, FolderKanban, LayoutDashboard, Settings, Clock, Star } from 'lucide-react';
import { useMemo } from 'react';

export default function Sidebar({ projects = [], onCreateProject }) {
    const location = useLocation();

    // Separate active projects (shown first) from completed/archived
    const activeProjects = useMemo(() =>
        projects.filter(p => p.status !== 'completed' && p.status !== 'archived'),
        [projects]);

    const pastProjects = useMemo(() =>
        projects.filter(p => p.status === 'completed' || p.status === 'archived'),
        [projects]);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <button onClick={onCreateProject} className="btn btn-primary w-full">
                    <Plus size={18} />
                    New Project
                </button>
            </div>

            {/* Quick Navigation */}
            <div className="sidebar-section">
                <div className="sidebar-title" style={{ fontSize: '.65rem', letterSpacing: '.06em' }}>NAVIGATION</div>
                <Link to="/dashboard" className={`sidebar-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                </Link>
                <Link to="/projects" className={`sidebar-nav-item ${location.pathname === '/projects' ? 'active' : ''}`}>
                    <FolderKanban size={14} />
                    <span>All Projects</span>
                </Link>
                <Link to="/settings" className={`sidebar-nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
                    <Settings size={14} />
                    <span>Settings</span>
                </Link>
            </div>

            {/* Active Projects */}
            <div className="sidebar-section" style={{ flex: 1 }}>
                <div className="sidebar-title" style={{ fontSize: '.65rem', letterSpacing: '.06em' }}>
                    <Star size={10} style={{ marginRight: 4 }} />
                    ACTIVE PROJECTS
                    <span className="sidebar-count">{activeProjects.length}</span>
                </div>

                {activeProjects.length > 0 ? (
                    activeProjects.map((p) => {
                        const active = location.pathname === `/projects/${p.id}`;
                        return (
                            <Link
                                key={p.id}
                                to={`/projects/${p.id}`}
                                className={`sidebar-item ${active ? 'active' : ''}`}
                            >
                                <div className="project-dot" style={{ background: p.color || '#8b5cf6' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="truncate font-semibold text-sm">{p.name}</div>
                                    {p.description && (
                                        <div className="truncate text-xs text-muted">{p.description}</div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="text-muted text-sm text-center" style={{ padding: 'var(--sp-lg)' }}>
                        No active projects
                    </div>
                )}
            </div>

            {/* Past / Completed Projects */}
            {pastProjects.length > 0 && (
                <div className="sidebar-section sidebar-past-projects">
                    <div className="sidebar-title" style={{ fontSize: '.65rem', letterSpacing: '.06em' }}>
                        <Clock size={10} style={{ marginRight: 4 }} />
                        PAST PROJECTS
                        <span className="sidebar-count">{pastProjects.length}</span>
                    </div>
                    {pastProjects.map((p) => {
                        const active = location.pathname === `/projects/${p.id}`;
                        return (
                            <Link
                                key={p.id}
                                to={`/projects/${p.id}`}
                                className={`sidebar-item past ${active ? 'active' : ''}`}
                            >
                                <div className="project-dot" style={{
                                    background: p.color || '#6b7280',
                                    opacity: 0.5,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="truncate text-sm" style={{ opacity: .7 }}>{p.name}</div>
                                    <div className="truncate text-xs text-muted" style={{ opacity: .5 }}>
                                        {p.status === 'completed' ? '✓ Completed' : '📦 Archived'}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* If no past projects exist, show all projects as a fallback  */}
            {pastProjects.length === 0 && projects.length > 0 && (
                <div className="sidebar-section sidebar-past-projects">
                    <div className="sidebar-title" style={{ fontSize: '.65rem', letterSpacing: '.06em' }}>
                        <FolderKanban size={10} style={{ marginRight: 4 }} />
                        ALL PROJECTS
                    </div>
                    {projects.slice(0, 5).map((p) => {
                        const active = location.pathname === `/projects/${p.id}`;
                        return (
                            <Link
                                key={`all-${p.id}`}
                                to={`/projects/${p.id}`}
                                className={`sidebar-item ${active ? 'active' : ''}`}
                                style={{ padding: '6px var(--sp-sm)' }}
                            >
                                <div className="project-dot" style={{
                                    background: p.color || '#8b5cf6',
                                    width: 6, height: 6,
                                }} />
                                <span className="truncate text-xs">{p.name}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}
