import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, FolderKanban, LayoutDashboard, FolderOpen, X } from 'lucide-react';
import { projectsAPI } from '../services/api';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Ctrl+K / Cmd+K to open
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIdx(0);
            loadProjects();
        }
    }, [open]);

    const loadProjects = async () => {
        try {
            const res = await projectsAPI.getAll();
            setProjects(res.data || []);
        } catch (e) { console.error(e); }
    };

    const pages = [
        { type: 'page', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { type: 'page', label: 'Projects', icon: FolderOpen, path: '/projects' },
    ];

    const results = useMemo(() => {
        const q = query.toLowerCase().trim();
        const items = [
            ...pages.map(p => ({ ...p, searchText: p.label.toLowerCase() })),
            ...projects.map(p => ({
                type: 'project',
                label: p.name,
                description: p.description,
                icon: FolderKanban,
                path: `/projects/${p.id}`,
                color: p.color,
                searchText: `${p.name} ${p.description || ''}`.toLowerCase(),
            })),
        ];
        if (!q) return items;
        return items.filter(i => i.searchText.includes(q));
    }, [query, projects]);

    useEffect(() => { setSelectedIdx(0); }, [query]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIdx]) {
            navigate(results[selectedIdx].path);
            setOpen(false);
        }
    };

    if (!open) return null;

    return (
        <div className="cmd-overlay" onClick={() => setOpen(false)}>
            <div className="cmd-palette" onClick={e => e.stopPropagation()}>
                <div className="cmd-search-row">
                    <Search size={18} className="cmd-search-icon" />
                    <input
                        ref={inputRef}
                        className="cmd-input"
                        placeholder="Search projects, pages..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <kbd className="cmd-kbd">ESC</kbd>
                </div>
                <div className="cmd-results">
                    {results.length === 0 && (
                        <div className="cmd-empty text-muted text-sm">No results found</div>
                    )}
                    {results.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={`${item.type}-${item.path}`}
                                className={`cmd-item ${idx === selectedIdx ? 'selected' : ''}`}
                                onClick={() => { navigate(item.path); setOpen(false); }}
                                onMouseEnter={() => setSelectedIdx(idx)}
                            >
                                <div className="cmd-item-icon" style={item.color ? { background: item.color + '20', color: item.color } : {}}>
                                    <Icon size={15} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="text-sm font-semibold">{item.label}</div>
                                    {item.description && <div className="text-xs text-muted truncate">{item.description}</div>}
                                </div>
                                <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{item.type}</span>
                                <ArrowRight size={13} style={{ opacity: .3 }} />
                            </div>
                        );
                    })}
                </div>
                <div className="cmd-footer">
                    <span className="text-xs text-muted">↑↓ Navigate</span>
                    <span className="text-xs text-muted">↵ Open</span>
                    <span className="text-xs text-muted">ESC Close</span>
                </div>
            </div>
        </div>
    );
}
