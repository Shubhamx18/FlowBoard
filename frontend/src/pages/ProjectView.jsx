import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, tasksAPI } from '../services/api';
import { getSocketUrl } from '../services/config';

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import VideoCall from '../components/VideoCall';
import TeamPanel from '../components/TeamPanel';
import ActivityPanel from '../components/ActivityPanel';
import IncomingCallOverlay from '../components/IncomingCallOverlay';
import FocusMode from '../components/FocusMode';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import ProgressCharts from '../components/ProgressCharts';
import TaskDetailModal, { LABEL_PRESETS } from '../components/TaskDetailModal';
import ProjectSettings from '../components/ProjectSettings';
import {
    Plus, X, MessageSquare, Video, Users, Activity,
    Calendar, ArrowRight, LayoutGrid, List, CalendarDays,
    BarChart3, Target, Search, Filter, Settings, Tag
} from 'lucide-react';

const COLUMNS = [
    { key: 'todo', label: 'To Do', color: '#f59e0b', icon: '📋' },
    { key: 'in_progress', label: 'In Progress', color: '#3b82f6', icon: '🔨' },
    { key: 'review', label: 'Review', color: '#8b5cf6', icon: '👀' },
    { key: 'done', label: 'Done', color: '#10b981', icon: '✅' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const VIEW_MODES = [
    { key: 'kanban', label: 'Board', icon: LayoutGrid },
    { key: 'list', label: 'List', icon: List },
    { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export default function ProjectView() {
    const { id } = useParams();
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewTask, setShowNewTask] = useState(null);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
    const [showChat, setShowChat] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const [showCharts, setShowCharts] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [viewMode, setViewMode] = useState('kanban');
    const [focusTask, setFocusTask] = useState(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    // New feature state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [showProjectSettings, setShowProjectSettings] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    const socketRef = useRef(null);
    const userRef = useRef(user);
    userRef.current = user; // always keep latest user

    // Socket.IO connection — only re-runs when project ID or user ID changes
    useEffect(() => {
        const currentUser = userRef.current;
        if (!currentUser?.id) return; // don't connect until we have a user

        const url = getSocketUrl();

        // Disconnect previous socket if any
        if (socketRef.current) {
            socketRef.current.emit('leave-project', id);
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const socket = io(url, {
            auth: { token: localStorage.getItem('token') },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        const joinProject = () => {
            const u = userRef.current;
            if (u) {
                socket.emit('join-project', {
                    projectId: id,
                    user: { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, status: 'online' },
                });
            }
        };

        socket.on('connect', joinProject);
        // Re-join after auto-reconnect (socket.io reconnects automatically)
        socket.io.on('reconnect', joinProject);

        socket.on('online_users', (users) => setOnlineUsers(users));
        socket.on('task_created', (task) => { if (task.project_id == id) setTasks(prev => [...prev, task]); });
        socket.on('task_updated', (task) => { if (task.project_id == id) setTasks(prev => prev.map(t => t.id === task.id ? task : t)); });
        socket.on('task_deleted', ({ taskId }) => { setTasks(prev => prev.filter(t => t.id !== taskId)); });

        // Incoming call — show overlay
        socket.on('incoming_call', (data) => setIncomingCall(data));

        // call_ended cleanup — VideoCall handles the rest internally
        socket.on('call_ended', () => {
            setActiveCall(null);
            setIncomingCall(null);
        });

        return () => {
            socket.emit('leave-project', id);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [id, user?.id]);

    useEffect(() => { loadProject(); }, [id]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            switch (e.key.toLowerCase()) {
                case 'c': e.preventDefault(); setShowNewTask('todo'); break;
                case 'n': e.preventDefault(); togglePanel('chat'); break;
                case 'v': e.preventDefault(); togglePanel('video'); break;
                case 'm': e.preventDefault(); togglePanel('members'); break;
                case 'a': e.preventDefault(); togglePanel('activity'); break;
                case 'g': e.preventDefault(); togglePanel('charts'); break;
                case '?': e.preventDefault(); setShowShortcuts(true); break;
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showChat, showVideo, showMembers, showActivity, showCharts]);

    const loadProject = async () => {
        setLoading(true);
        try {
            const [pRes, tRes, allP] = await Promise.all([
                projectsAPI.getOne(id), tasksAPI.getAll(id), projectsAPI.getAll(),
            ]);
            setProject(pRes.data); setTasks(tRes.data); setProjects(allP.data);
        } catch (e) { console.error('Load error:', e); }
        setLoading(false);
    };

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (filterStatus && t.status !== filterStatus) return false;
            if (filterPriority && t.priority !== filterPriority) return false;
            if (filterAssignee && String(t.assigned_to) !== filterAssignee) return false;
            return true;
        });
    }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee]);

    const activeFilterCount = [filterStatus, filterPriority, filterAssignee].filter(Boolean).length;

    const columns = useMemo(() => {
        const grouped = {};
        COLUMNS.forEach(c => { grouped[c.key] = []; });
        filteredTasks.forEach(t => {
            const s = t.status || 'todo';
            if (grouped[s]) grouped[s].push(t); else grouped.todo.push(t);
        });
        return grouped;
    }, [filteredTasks]);

    // Drag & Drop handlers
    const handleDragStart = (e, taskId) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
    };
    const handleDragEnd = (e) => {
        setDraggedTaskId(null);
        setDragOverCol(null);
        e.currentTarget.classList.remove('dragging');
    };
    const handleDragOver = (e, colKey) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colKey);
    };
    const handleDragLeave = () => setDragOverCol(null);
    const handleDrop = (e, colKey) => {
        e.preventDefault();
        setDragOverCol(null);
        if (draggedTaskId) {
            const task = tasks.find(t => t.id === draggedTaskId);
            if (task && task.status !== colKey) moveTask(task, colKey);
        }
        setDraggedTaskId(null);
    };

    // Get task labels from description metadata
    const getTaskLabels = (desc) => {
        if (!desc) return [];
        const m = desc.match(/\[labels:(.*?)\]/);
        return m ? m[1].split(',').filter(Boolean) : [];
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...taskForm };
            if (!payload.assigned_to) delete payload.assigned_to;
            else payload.assigned_to = parseInt(payload.assigned_to);
            await tasksAPI.create(id, { ...payload, status: showNewTask });
            setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
            setShowNewTask(null);
            loadProject();
        } catch (e) { console.error(e); }
    };

    const moveTask = async (task, newStatus) => {
        try {
            await tasksAPI.update(task.id, { ...task, status: newStatus });
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (e) { console.error(e); }
    };

    const deleteTask = async (taskId) => {
        try { await tasksAPI.delete(taskId); setTasks(prev => prev.filter(t => t.id !== taskId)); } catch (e) { console.error(e); }
    };

    const handleAcceptCall = () => {
        socketRef.current?.emit('answer_call', {
            targetUserId: incomingCall.callerId,
            channelName: incomingCall.channelName,
            projectId: id,
        });
        // Pass the full incoming call data to VideoCall via activeCall prop
        setActiveCall({
            callerName: incomingCall.callerName,
            callerId: incomingCall.callerId,
            channelName: incomingCall.channelName,
            callerSocketId: incomingCall.callerSocketId,
        });
        setShowVideo(true);  // auto-open video panel
        setIncomingCall(null);
    };

    const handleRejectCall = () => {
        socketRef.current?.emit('reject_call', { targetUserId: incomingCall.callerId, projectId: id });
        setIncomingCall(null);
    };

    const priorityColor = (p) => ({ low: '#94a3b8', medium: '#f59e0b', high: '#f97316', urgent: '#ef4444' }[p] || '#94a3b8');
    const nextStatus = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' };

    const togglePanel = (panel) => {
        // Chat and Video can coexist side-by-side — only toggle the one clicked
        if (panel === 'chat') {
            setShowChat(prev => !prev);
            // Close info panels when chat opens (they share the right slot)
            setShowMembers(false); setShowActivity(false); setShowCharts(false);
        } else if (panel === 'video') {
            setShowVideo(prev => !prev);
            // Close info panels when video opens
            setShowMembers(false); setShowActivity(false); setShowCharts(false);
        } else {
            // Info panels (members/activity/charts) are mutually exclusive
            // and also close chat + video to avoid overcrowding
            setShowMembers(panel === 'members' ? !showMembers : false);
            setShowActivity(panel === 'activity' ? !showActivity : false);
            setShowCharts(panel === 'charts' ? !showCharts : false);
            setShowChat(false);
            setShowVideo(false);
        }
    };

    const handleMembersChanged = (newMembers) => setProject(prev => ({ ...prev, members: newMembers }));
    const members = project?.members || [];

    const getMemberName = (userId) => {
        const m = members.find(m => m.id === userId);
        return m ? `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}` : null;
    };

    // Calendar helpers
    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        return days;
    }, [calendarMonth]);

    const tasksByDate = useMemo(() => {
        const map = {};
        tasks.forEach(t => {
            if (t.due_date) {
                const d = new Date(t.due_date).toISOString().slice(0, 10);
                if (!map[d]) map[d] = [];
                map[d].push(t);
            }
        });
        return map;
    }, [tasks]);

    if (loading) return (
        <>
            <Navbar />
            <div className="app-layout">
                <Sidebar projects={projects} />
                <main className="main-content"><div className="loading-screen"><div className="spinner spinner-lg" /></div></main>
            </div>
        </>
    );

    return (
        <>
            <Navbar />
            <div className="app-layout">
                <Sidebar projects={projects} />

                <main className="main-content" style={{ padding: 'var(--sp-lg)', overflowX: 'auto' }}>
                    {/* Project Header */}
                    <div className="flex-between" style={{ marginBottom: 'var(--sp-lg)', flexWrap: 'wrap', gap: 'var(--sp-md)' }}>
                        <div>
                            <div className="flex gap-sm items-center" style={{ marginBottom: 4 }}>
                                <div style={{
                                    width: 14, height: 14, borderRadius: 'var(--r-full)',
                                    background: project?.color || 'var(--primary)',
                                    boxShadow: `0 0 10px ${project?.color || 'var(--primary)'}60`,
                                }} />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{project?.name}</h2>
                            </div>
                            {project?.description && <p className="text-muted text-sm">{project.description}</p>}
                        </div>
                        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                            {/* View mode toggle */}
                            <div className="view-toggle">
                                {VIEW_MODES.map(vm => (
                                    <button
                                        key={vm.key}
                                        className={`view-toggle-btn ${viewMode === vm.key ? 'active' : ''}`}
                                        onClick={() => setViewMode(vm.key)}
                                        title={vm.label}
                                    >
                                        <vm.icon size={14} />
                                    </button>
                                ))}
                            </div>

                            <button className={`btn btn-sm ${showCharts ? 'btn-primary' : 'btn-ghost'}`} onClick={() => togglePanel('charts')}>
                                <BarChart3 size={15} /> Charts
                            </button>
                            <button className={`btn btn-sm ${showMembers ? 'btn-primary' : 'btn-ghost'}`} onClick={() => togglePanel('members')}>
                                <Users size={15} /><span>Team</span><span className="header-badge">{members.length}</span>
                            </button>
                            <button className={`btn btn-sm ${showActivity ? 'btn-primary' : 'btn-ghost'}`} onClick={() => togglePanel('activity')}>
                                <Activity size={15} /> Activity
                            </button>
                            <button className={`btn btn-sm ${showChat ? 'btn-primary' : 'btn-ghost'}`} onClick={() => togglePanel('chat')}>
                                <MessageSquare size={15} /> Chat
                            </button>
                            <button
                                className={`btn btn-sm ${showVideo ? 'btn-outline' : 'btn-ghost'}`}
                                onClick={() => togglePanel('video')}
                                style={showVideo ? { borderColor: 'rgba(139,92,246,.4)', color: '#c4b5fd' } : {}}
                            >
                                <Video size={15} /> Video
                            </button>
                            <button className="btn-icon" onClick={() => setShowProjectSettings(true)} title="Project Settings">
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ═══ SEARCH & FILTER BAR ═══ */}
                    <div className="task-filter-bar">
                        <div className="task-search-wrapper">
                            <Search size={14} className="task-search-icon" />
                            <input
                                className="task-search-input"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && <button className="btn-icon" style={{ width: 20, height: 20 }} onClick={() => setSearchQuery('')}><X size={12} /></button>}
                        </div>
                        <button className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowFilters(!showFilters)}>
                            <Filter size={13} /> Filters {activeFilterCount > 0 && <span className="header-badge">{activeFilterCount}</span>}
                        </button>
                        {activeFilterCount > 0 && (
                            <button className="btn btn-ghost btn-xs" onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); }}>Clear all</button>
                        )}
                        {searchQuery && <span className="text-xs text-muted">{filteredTasks.length} result{filteredTasks.length !== 1 ? 's' : ''}</span>}
                    </div>
                    {showFilters && (
                        <div className="task-filter-pills">
                            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                            <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                                <option value="">All Priorities</option>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                            </select>
                            <select className="filter-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                                <option value="">All Members</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.first_name || m.email}</option>)}
                            </select>
                        </div>
                    )}

                    {/* ═══ KANBAN VIEW ═══ */}
                    {viewMode === 'kanban' && (
                        <div className="kanban-board">
                            {COLUMNS.map((col, colIdx) => (
                                <div key={col.key}
                                    className={`kanban-col animate-card ${dragOverCol === col.key ? 'drag-over' : ''}`}
                                    style={{ animationDelay: `${colIdx * 60}ms` }}
                                    onDragOver={(e) => handleDragOver(e, col.key)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, col.key)}
                                >
                                    <div className="kanban-col-header">
                                        <div className="kanban-col-title">
                                            <div className="kanban-col-dot" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}60` }} />
                                            {col.label}
                                        </div>
                                        <div className="flex gap-xs items-center">
                                            <span className="kanban-col-count">{columns[col.key]?.length || 0}</span>
                                            <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => setShowNewTask(col.key)} title="Add task">
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {columns[col.key]?.map((task, tIdx) => {
                                        const assigneeInitials = getMemberName(task.assigned_to);
                                        const labels = getTaskLabels(task.description);
                                        const cleanDesc = (task.description || '').replace(/\n?\[labels:.*?\]/, '').trim();
                                        return (
                                            <div key={task.id}
                                                className={`task-card animate-card ${draggedTaskId === task.id ? 'dragging' : ''}`}
                                                style={{ borderLeft: `3px solid ${priorityColor(task.priority)}`, animationDelay: `${colIdx * 60 + tIdx * 40}ms`, cursor: 'grab' }}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                onDragEnd={handleDragEnd}
                                                onClick={() => setSelectedTaskId(task.id)}
                                            >
                                                <div className="flex-between" style={{ marginBottom: 4 }}>
                                                    <span className="font-semibold text-sm" style={{ flex: 1, lineHeight: 1.3 }}>{task.title}</span>
                                                    <div className="flex gap-xs" onClick={e => e.stopPropagation()}>
                                                        <button className="btn-icon task-focus-btn" style={{ width: 22, height: 22 }} onClick={() => setFocusTask(task)} title="Focus mode">
                                                            <Target size={10} />
                                                        </button>
                                                        <button className="btn-icon" style={{ width: 22, height: 22, opacity: .5 }} onClick={() => deleteTask(task.id)}>
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {/* Labels */}
                                                {labels.length > 0 && (
                                                    <div className="flex gap-xs" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-xs)' }}>
                                                        {labels.map(lbl => {
                                                            const preset = LABEL_PRESETS.find(p => p.name === lbl);
                                                            return (
                                                                <span key={lbl} className="task-card-label" style={{ background: `${preset?.color || '#6b7280'}20`, color: preset?.color || '#6b7280' }}>
                                                                    {lbl}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {cleanDesc && (
                                                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--sp-sm)', lineHeight: 1.4 }}>
                                                        {cleanDesc.length > 80 ? cleanDesc.slice(0, 80) + '...' : cleanDesc}
                                                    </p>
                                                )}
                                                <div className="flex-between">
                                                    <div className="flex gap-xs items-center">
                                                        <span className={`badge badge-${task.priority || 'medium'}`}>{task.priority || 'medium'}</span>
                                                        {assigneeInitials && (
                                                            <div className="task-assignee-avatar" title={`Assigned to ${task.assigned_first_name || ''} ${task.assigned_last_name || ''}`}>
                                                                {assigneeInitials}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button className="btn-icon"
                                                        style={{
                                                            width: 24, height: 24, borderRadius: 'var(--r-full)',
                                                            background: `${COLUMNS.find(c => c.key === nextStatus[col.key])?.color || '#94a3b8'}12`,
                                                            border: `1px solid ${COLUMNS.find(c => c.key === nextStatus[col.key])?.color || '#94a3b8'}30`,
                                                            color: COLUMNS.find(c => c.key === nextStatus[col.key])?.color || '#94a3b8',
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); moveTask(task, nextStatus[col.key]); }}
                                                        title={`Move to ${COLUMNS.find(c => c.key === nextStatus[col.key])?.label}`}
                                                    >
                                                        <ArrowRight size={11} />
                                                    </button>
                                                </div>
                                                {task.due_date && (
                                                    <div className="flex gap-xs items-center text-xs text-muted" style={{ marginTop: 'var(--sp-xs)' }}>
                                                        <Calendar size={10} />
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {columns[col.key]?.length === 0 && (
                                        <div className="kanban-empty"><span style={{ opacity: .5 }}>{col.icon} No tasks</span></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ═══ LIST VIEW ═══ */}
                    {viewMode === 'list' && (
                        <div className="list-view animate-card">
                            <table className="list-table">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Assignee</th>
                                        <th>Due Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.length === 0 && (
                                        <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--sp-xl)' }}>No tasks yet</td></tr>
                                    )}
                                    {filteredTasks.map(task => {
                                        const statusCol = COLUMNS.find(c => c.key === task.status) || COLUMNS[0];
                                        const assignee = members.find(m => m.id === task.assigned_to);
                                        return (
                                            <tr key={task.id}>
                                                <td>
                                                    <div className="font-semibold text-sm">{task.title}</div>
                                                    {task.description && <div className="text-xs text-muted truncate" style={{ maxWidth: 300 }}>{task.description}</div>}
                                                </td>
                                                <td><span className="list-status-badge" style={{ background: statusCol.color + '18', color: statusCol.color, borderColor: statusCol.color + '30' }}>{statusCol.label}</span></td>
                                                <td><span className={`badge badge-${task.priority || 'medium'}`}>{task.priority || 'medium'}</span></td>
                                                <td>
                                                    {assignee ? (
                                                        <div className="flex gap-xs items-center">
                                                            <div className="task-assignee-avatar">{assignee.first_name?.[0]}{assignee.last_name?.[0]}</div>
                                                            <span className="text-xs">{assignee.first_name}</span>
                                                        </div>
                                                    ) : <span className="text-xs text-muted">—</span>}
                                                </td>
                                                <td className="text-xs text-muted">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                                                <td>
                                                    <div className="flex gap-xs">
                                                        <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => setFocusTask(task)} title="Focus"><Target size={11} /></button>
                                                        <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => moveTask(task, nextStatus[task.status || 'todo'])} title="Move">
                                                            <ArrowRight size={11} />
                                                        </button>
                                                        <button className="btn-icon" style={{ width: 24, height: 24, color: '#ef4444' }} onClick={() => deleteTask(task.id)} title="Delete">
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <button className="btn btn-primary btn-sm" style={{ margin: 'var(--sp-md)' }} onClick={() => setShowNewTask('todo')}>
                                <Plus size={14} /> Add Task
                            </button>
                        </div>
                    )}

                    {/* ═══ CALENDAR VIEW ═══ */}
                    {viewMode === 'calendar' && (
                        <div className="calendar-view animate-card">
                            <div className="calendar-header">
                                <button className="btn btn-ghost btn-sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>←</button>
                                <h3 style={{ fontWeight: 700 }}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>→</button>
                            </div>
                            <div className="calendar-grid">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="calendar-day-label">{d}</div>
                                ))}
                                {calendarDays.map((day, idx) => {
                                    if (!day) return <div key={`e-${idx}`} className="calendar-cell empty" />;
                                    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayTasks = tasksByDate[dateStr] || [];
                                    const today = new Date();
                                    const isToday = day === today.getDate() && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear();
                                    return (
                                        <div key={day} className={`calendar-cell ${isToday ? 'today' : ''}`}>
                                            <span className={`calendar-day-num ${isToday ? 'today-num' : ''}`}>{day}</span>
                                            {dayTasks.slice(0, 3).map(t => (
                                                <div key={t.id} className="calendar-task"
                                                    style={{ borderLeft: `2px solid ${priorityColor(t.priority)}` }}
                                                    onClick={() => setFocusTask(t)}
                                                >
                                                    {t.title.length > 14 ? t.title.slice(0, 14) + '…' : t.title}
                                                </div>
                                            ))}
                                            {dayTasks.length > 3 && <div className="text-xs text-muted">+{dayTasks.length - 3} more</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>

                {showChat && <ChatPanel projectId={id} socket={socketRef.current} currentUser={user} members={members} />}
                {showVideo && (
                    <VideoCall socket={socketRef.current} user={user} onlineUsers={onlineUsers}
                        projectId={id} onClose={() => setShowVideo(false)}
                        activeCall={activeCall} onCallStateChange={setActiveCall} />
                )}
                {showMembers && (
                    <TeamPanel projectId={id} members={members} ownerId={project?.owner_id}
                        currentUserId={user?.id} onMembersChanged={handleMembersChanged}
                        onClose={() => setShowMembers(false)} onlineUsers={onlineUsers} />
                )}
                {showActivity && <ActivityPanel projectId={id} onClose={() => setShowActivity(false)} />}
                {showCharts && (
                    <div className="side-panel animate-card" style={{ width: 360, minWidth: 360, background: 'var(--glass-bg)', borderLeft: '1px solid var(--glass-border)' }}>
                        <ProgressCharts tasks={tasks} members={members} />
                    </div>
                )}
            </div>

            {/* New Task Modal */}
            {showNewTask && (
                <div className="modal-overlay" onClick={() => setShowNewTask(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Task</h3>
                            <button className="modal-close" onClick={() => setShowNewTask(null)}>×</button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input className="form-input" placeholder="What needs to be done?"
                                        value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" placeholder="Add details..." rows={3}
                                        value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select className="form-select" value={taskForm.priority}
                                            onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input className="form-input" type="date"
                                            value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assign To</label>
                                    <select className="form-select" value={taskForm.assigned_to}
                                        onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                                        <option value="">Unassigned</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name} {m.id === user?.id ? '(you)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowNewTask(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Focus Mode overlay */}
            {focusTask && <FocusMode task={focusTask} onClose={() => setFocusTask(null)} />}

            {/* Keyboard Shortcuts modal */}
            {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

            {/* Task Detail Modal */}
            {selectedTaskId && (
                <TaskDetailModal
                    taskId={selectedTaskId}
                    projectId={id}
                    members={members}
                    onClose={() => setSelectedTaskId(null)}
                    onTaskUpdated={loadProject}
                />
            )}

            {/* Project Settings */}
            {showProjectSettings && (
                <div className="modal-overlay" onClick={() => setShowProjectSettings(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: 420, maxHeight: '90vh', overflowY: 'auto' }}>
                        <ProjectSettings
                            project={project}
                            onClose={() => setShowProjectSettings(false)}
                            onUpdated={() => { loadProject(); setShowProjectSettings(false); }}
                        />
                    </div>
                </div>
            )}

            {incomingCall && <IncomingCallOverlay caller={incomingCall} onAccept={handleAcceptCall} onReject={handleRejectCall} />}
        </>
    );
}
