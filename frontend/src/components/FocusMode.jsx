import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Target, Coffee, Check } from 'lucide-react';

const WORK_TIME = 25 * 60; // 25 min
const BREAK_TIME = 5 * 60; // 5 min

export default function FocusMode({ task, onClose }) {
    const [timeLeft, setTimeLeft] = useState(WORK_TIME);
    const [running, setRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [sessions, setSessions] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        playSound();
                        if (isBreak) {
                            setIsBreak(false);
                            setRunning(false);
                            return WORK_TIME;
                        } else {
                            setSessions(s => s + 1);
                            setIsBreak(true);
                            setRunning(false);
                            return BREAK_TIME;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(intervalRef.current);
    }, [running, isBreak]);

    const playSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = isBreak ? 523 : 659; // C5 or E5
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                osc2.connect(gain);
                osc2.frequency.value = isBreak ? 659 : 784;
                osc2.start();
                osc2.stop(ctx.currentTime + 0.3);
            }, 350);
        } catch (e) { }
    };

    const toggleTimer = () => setRunning(!running);

    const resetTimer = () => {
        clearInterval(intervalRef.current);
        setRunning(false);
        setIsBreak(false);
        setTimeLeft(WORK_TIME);
    };

    const totalTime = isBreak ? BREAK_TIME : WORK_TIME;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const circumference = 2 * Math.PI * 120;
    const strokeOffset = circumference - (progress / 100) * circumference;

    // Esc to close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="focus-overlay">
            <div className="focus-container">
                <button className="focus-close" onClick={onClose}><X size={20} /></button>

                <div className="focus-task-info">
                    <span className={`badge badge-${task.priority || 'medium'}`} style={{ marginBottom: 8 }}>
                        {task.priority || 'medium'}
                    </span>
                    <h2 className="focus-task-title">{task.title}</h2>
                    {task.description && <p className="text-muted text-sm" style={{ maxWidth: 400 }}>{task.description}</p>}
                </div>

                <div className="focus-timer-ring">
                    <svg width="260" height="260" viewBox="0 0 260 260">
                        <circle
                            cx="130" cy="130" r="120"
                            fill="none"
                            stroke="rgba(255,255,255,.05)"
                            strokeWidth="6"
                        />
                        <circle
                            cx="130" cy="130" r="120"
                            fill="none"
                            stroke={isBreak ? '#10b981' : 'var(--primary)'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeOffset}
                            transform="rotate(-90 130 130)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                    </svg>
                    <div className="focus-timer-inner">
                        <div className="focus-timer-label">
                            {isBreak ? <Coffee size={18} /> : <Target size={18} />}
                            {isBreak ? 'Break' : 'Focus'}
                        </div>
                        <div className="focus-timer-time">
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </div>
                    </div>
                </div>

                <div className="focus-controls">
                    <button className="btn btn-ghost btn-sm" onClick={resetTimer}>
                        <RotateCcw size={15} /> Reset
                    </button>
                    <button
                        className={`btn ${running ? 'btn-outline' : 'btn-primary'}`}
                        onClick={toggleTimer}
                        style={{ minWidth: 120 }}
                    >
                        {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
                    </button>
                </div>

                <div className="focus-sessions">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className={`focus-session-dot ${i < sessions ? 'completed' : ''}`}
                        >
                            {i < sessions && <Check size={10} />}
                        </div>
                    ))}
                    <span className="text-xs text-muted" style={{ marginLeft: 8 }}>{sessions}/4 sessions</span>
                </div>
            </div>
        </div>
    );
}
