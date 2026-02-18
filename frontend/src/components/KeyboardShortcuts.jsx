import { useState, useEffect } from 'react';
import { X, Command, MessageSquare, Video, Users, Activity, Target, BarChart3 } from 'lucide-react';

const SHORTCUTS = [
    { key: 'Ctrl + K', label: 'Command palette', icon: Command },
    { key: 'C', label: 'Create new task', icon: null },
    { key: 'N', label: 'Toggle chat', icon: MessageSquare },
    { key: 'V', label: 'Toggle video', icon: Video },
    { key: 'M', label: 'Toggle team members', icon: Users },
    { key: 'A', label: 'Toggle activity', icon: Activity },
    { key: 'G', label: 'Toggle charts', icon: BarChart3 },
    { key: '?', label: 'Show this help', icon: null },
    { key: 'Esc', label: 'Close panel / modal', icon: null },
];

export default function KeyboardShortcuts({ onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">⌨️ Keyboard Shortcuts</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="shortcuts-list">
                    {SHORTCUTS.map(s => (
                        <div key={s.key} className="shortcut-row">
                            <div className="flex gap-sm items-center">
                                {s.icon && <s.icon size={14} style={{ opacity: .5 }} />}
                                <span className="text-sm">{s.label}</span>
                            </div>
                            <kbd className="shortcut-key">{s.key}</kbd>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
