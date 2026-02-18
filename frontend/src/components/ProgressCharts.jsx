import { useMemo } from 'react';

export default function ProgressCharts({ tasks, members }) {
    const stats = useMemo(() => {
        const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 };
        const byMember = {};

        tasks.forEach(t => {
            const s = t.status || 'todo';
            if (byStatus[s] !== undefined) byStatus[s]++;

            const uid = t.assigned_to;
            if (uid) {
                if (!byMember[uid]) byMember[uid] = { total: 0, done: 0 };
                byMember[uid].total++;
                if (s === 'done') byMember[uid].done++;
            }
        });

        const total = tasks.length || 1;
        const completionRate = Math.round((byStatus.done / total) * 100);

        return { byStatus, byMember, total, completionRate };
    }, [tasks]);

    const statusColors = {
        todo: '#f59e0b',
        in_progress: '#3b82f6',
        review: '#8b5cf6',
        done: '#10b981',
    };

    const statusLabels = {
        todo: 'To Do',
        in_progress: 'In Progress',
        review: 'Review',
        done: 'Done',
    };

    // SVG donut chart
    const DonutChart = ({ percentage, color, size = 80, strokeWidth = 8 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset .6s ease' }} />
                <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                    fill="currentColor" fontSize={size * 0.22} fontWeight="700">{percentage}%</text>
            </svg>
        );
    };

    const getMember = (uid) => members.find(m => m.id === parseInt(uid));

    return (
        <div className="charts-panel">
            <div className="charts-panel-header">
                <h3 style={{ fontSize: '.9375rem', fontWeight: 700 }}>📈 Project Progress</h3>
            </div>

            <div className="charts-grid">
                {/* Overall completion */}
                <div className="chart-card">
                    <div className="chart-card-title">Overall Completion</div>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-sm) 0' }}>
                        <DonutChart percentage={stats.completionRate} color="var(--primary)" size={100} strokeWidth={10} />
                    </div>
                    <div className="text-xs text-muted text-center">{stats.byStatus.done} of {tasks.length} tasks done</div>
                </div>

                {/* Status breakdown */}
                <div className="chart-card">
                    <div className="chart-card-title">By Status</div>
                    <div className="chart-bars">
                        {Object.entries(stats.byStatus).map(([status, count]) => (
                            <div key={status} className="chart-bar-row">
                                <div className="flex-between" style={{ marginBottom: 3 }}>
                                    <span className="text-xs">{statusLabels[status]}</span>
                                    <span className="text-xs text-muted">{count}</span>
                                </div>
                                <div className="chart-bar-track">
                                    <div
                                        className="chart-bar-fill"
                                        style={{
                                            width: `${(count / (tasks.length || 1)) * 100}%`,
                                            background: statusColors[status],
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Per-member progress */}
            {Object.keys(stats.byMember).length > 0 && (
                <div className="chart-card" style={{ marginTop: 'var(--sp-md)' }}>
                    <div className="chart-card-title">Per Member</div>
                    <div className="chart-members">
                        {Object.entries(stats.byMember).map(([uid, data]) => {
                            const member = getMember(uid);
                            const pct = Math.round((data.done / (data.total || 1)) * 100);
                            return (
                                <div key={uid} className="chart-member-row">
                                    <div className="avatar avatar-xs">
                                        {member?.first_name?.[0] || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="flex-between" style={{ marginBottom: 3 }}>
                                            <span className="text-xs font-semibold truncate">
                                                {member ? `${member.first_name} ${member.last_name || ''}` : `User ${uid}`}
                                            </span>
                                            <span className="text-xs text-muted">{data.done}/{data.total}</span>
                                        </div>
                                        <div className="chart-bar-track">
                                            <div
                                                className="chart-bar-fill"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: `linear-gradient(90deg, var(--primary), var(--secondary))`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <DonutChart percentage={pct} color="var(--primary)" size={36} strokeWidth={4} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
