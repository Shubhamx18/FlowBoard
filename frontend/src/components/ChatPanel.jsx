import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Pin, PinOff, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { getBackendUrl } from '../services/config';

// Use direct axios calls with token — bypasses any config issues
function getToken() { return localStorage.getItem('token'); }
function apiUrl(path) {
    return `${getBackendUrl()}/api${path}`;
}
function authHeaders() {
    return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

export default function ChatPanel({ projectId, socket, currentUser, members = [] }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showPinned, setShowPinned] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);
    const inputRef = useRef(null);
    const messageIdsRef = useRef(new Set());

    // Add message without duplicates
    const addMessage = useCallback((msg) => {
        if (!msg?.id) return;
        if (messageIdsRef.current.has(msg.id)) return;
        messageIdsRef.current.add(msg.id);
        setMessages(prev => [...prev, msg]);
    }, []);

    // Load messages from API
    const loadMessages = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(apiUrl(`/messages/project/${projectId}`), {
                headers: authHeaders(),
            });
            const msgs = res.data || [];
            messageIdsRef.current = new Set(msgs.map(m => m.id));
            setMessages(msgs);
        } catch (e) {
            console.error('[Chat] Load messages error:', e);
            setError('Could not load messages. ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Load pinned messages
    const loadPinned = useCallback(async () => {
        if (!projectId) return;
        try {
            const res = await axios.get(apiUrl(`/messages/project/${projectId}/pinned`), {
                headers: authHeaders(),
            });
            setPinnedMessages(res.data || []);
        } catch (e) {
            console.error('[Chat] Load pinned error:', e);
        }
    }, [projectId]);

    // Initial load
    useEffect(() => {
        messageIdsRef.current = new Set();
        setMessages([]);
        setPinnedMessages([]);
        setError(null);
        loadMessages();
        loadPinned();
    }, [projectId, loadMessages, loadPinned]);

    // Socket listeners
    useEffect(() => {
        if (!socket || !projectId) return;

        const handleNewMessage = (msg) => {
            // Only add if from another user (sender adds via API response)
            if (msg?.author_id !== currentUser?.id) {
                addMessage(msg);
            }
        };

        const handleTyping = (data) => {
            if (!data?.userId || data.userId === currentUser?.id) return;
            setTypingUsers(prev => {
                if (prev.find(u => u.userId === data.userId)) return prev;
                return [...prev, data];
            });
            setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
            }, 3000);
        };

        const handleStopTyping = (data) => {
            setTypingUsers(prev => prev.filter(u => u.userId !== data?.userId));
        };

        socket.on('new-message', handleNewMessage);
        socket.on('user_typing', handleTyping);
        socket.on('user_stop_typing', handleStopTyping);

        return () => {
            socket.off('new-message', handleNewMessage);
            socket.off('user_typing', handleTyping);
            socket.off('user_stop_typing', handleStopTyping);
        };
    }, [socket, projectId, currentUser?.id, addMessage]);

    // Auto-scroll
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Typing indicator
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        if (!isTypingRef.current && socket) {
            isTypingRef.current = true;
            socket.emit('typing', { projectId, user: currentUser });
        }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socket?.emit('stop_typing', { projectId, user: currentUser });
        }, 1500);
    };

    // Send message
    const sendMessage = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || sending) return;

        setSending(true);
        setNewMessage('');
        isTypingRef.current = false;
        socket?.emit('stop_typing', { projectId, user: currentUser });
        clearTimeout(typingTimeoutRef.current);

        try {
            const headers = authHeaders();
            if (socket?.id) headers['x-socket-id'] = socket.id;

            const res = await axios.post(
                apiUrl(`/messages/project/${projectId}`),
                { content },
                { headers }
            );
            addMessage(res.data);
        } catch (e) {
            console.error('[Chat] Send error:', e);
            setNewMessage(content); // restore on error
        } finally {
            setSending(false);
        }
    };

    const handlePin = async (msgId) => {
        try {
            const res = await axios.put(apiUrl(`/messages/${msgId}/pin`), {}, { headers: authHeaders() });
            setPinnedMessages(prev => [res.data, ...prev.filter(m => m.id !== msgId)]);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: true } : m));
        } catch (e) { console.error('[Chat] Pin error:', e); }
    };

    const handleUnpin = async (msgId) => {
        try {
            await axios.delete(apiUrl(`/messages/${msgId}/pin`), { headers: authHeaders() });
            setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: false } : m));
        } catch (e) { console.error('[Chat] Unpin error:', e); }
    };

    const fmtTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-panel">
            {/* Header */}
            <div className="chat-header">
                <div className="flex-between">
                    <div className="flex gap-sm items-center">
                        <div style={{
                            width: 32, height: 32, borderRadius: 'var(--r-lg)',
                            background: 'var(--grad-primary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 12px var(--primary-glow)',
                        }}>
                            <Send size={14} color="white" />
                        </div>
                        <div>
                            <h5 style={{ fontSize: '.875rem' }}>Project Chat</h5>
                            <div className="flex gap-xs items-center">
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,.5)',
                                }} />
                                <span className="text-xs text-muted">Live</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-xs items-center">
                        {pinnedMessages.length > 0 && (
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setShowPinned(!showPinned)}
                                style={{ gap: 4, fontSize: '.7rem' }}
                            >
                                <Pin size={12} /> {pinnedMessages.length}
                                <ChevronDown size={10} style={{
                                    transform: showPinned ? 'rotate(180deg)' : 'none',
                                    transition: 'transform .2s'
                                }} />
                            </button>
                        )}
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={loadMessages}
                            style={{ fontSize: '.7rem' }}
                            title="Refresh messages"
                        >
                            ↻
                        </button>
                    </div>
                </div>
            </div>

            {/* Pinned Messages */}
            {showPinned && pinnedMessages.length > 0 && (
                <div className="chat-pinned-bar">
                    {pinnedMessages.map(pm => (
                        <div key={pm.id} className="chat-pinned-item">
                            <Pin size={10} style={{ color: '#fbbf24', flexShrink: 0 }} />
                            <span className="truncate text-xs">{pm.content}</span>
                            <button
                                className="btn-icon"
                                style={{ width: 18, height: 18, flexShrink: 0 }}
                                onClick={() => handleUnpin(pm.id)}
                                title="Unpin"
                            >
                                <PinOff size={9} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Messages Area */}
            <div className="chat-messages">
                {loading && (
                    <div className="flex-center" style={{ padding: 'var(--sp-xl)', opacity: .5 }}>
                        <div className="spinner" />
                    </div>
                )}

                {error && !loading && (
                    <div style={{
                        margin: 'var(--sp-md)',
                        padding: 'var(--sp-sm) var(--sp-md)',
                        background: 'rgba(239,68,68,.1)',
                        border: '1px solid rgba(239,68,68,.3)',
                        borderRadius: 'var(--r-md)',
                        fontSize: '.8rem',
                        color: '#f87171',
                    }}>
                        {error}
                        <button
                            onClick={loadMessages}
                            style={{ marginLeft: 8, textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#f87171' }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && messages.length === 0 && (
                    <div className="flex-center flex-col gap-md" style={{ padding: 'var(--sp-3xl) var(--sp-md)', opacity: .5 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 'var(--r-xl)',
                            background: 'var(--primary-soft)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Send size={28} style={{ color: 'var(--primary)' }} />
                        </div>
                        <p className="text-muted text-sm text-center">
                            No messages yet<br />Start the conversation!
                        </p>
                    </div>
                )}

                {!loading && messages.map((msg, i) => {
                    const own = msg.author_id === currentUser?.id;
                    const prevMsg = messages[i - 1];
                    const showAvatar = !own && (i === 0 || prevMsg?.author_id !== msg.author_id);
                    const senderName = msg.first_name || msg.email || '?';
                    const senderInitial = senderName[0]?.toUpperCase() || '?';

                    return (
                        <div key={msg.id} className={`chat-message ${own ? 'own' : ''}`}>
                            {!own && (
                                <div style={{ width: 28, flexShrink: 0 }}>
                                    {showAvatar && (
                                        <div className="avatar avatar-sm" style={{ width: 28, height: 28, fontSize: '.65rem' }}>
                                            {senderInitial}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ maxWidth: '78%' }}>
                                {showAvatar && !own && (
                                    <div className="text-xs text-muted" style={{ marginBottom: 2, marginLeft: 4 }}>
                                        {senderName}
                                    </div>
                                )}
                                <div className={`chat-bubble ${own ? 'own' : ''}`}>
                                    <div style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                                    <div className="chat-bubble-footer">
                                        <span className="text-xs" style={{ opacity: .5 }}>
                                            {fmtTime(msg.created_at)}
                                        </span>
                                        {msg.is_pinned && <Pin size={9} style={{ color: '#fbbf24' }} />}
                                        <button
                                            className="chat-pin-btn"
                                            onClick={() => msg.is_pinned ? handleUnpin(msg.id) : handlePin(msg.id)}
                                            title={msg.is_pinned ? 'Unpin' : 'Pin message'}
                                        >
                                            {msg.is_pinned ? <PinOff size={10} /> : <Pin size={10} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="chat-typing-indicator">
                        <div className="typing-dots">
                            <span /><span /><span />
                        </div>
                        <span className="text-xs text-muted">
                            {typingUsers.map(u => u.first_name || 'Someone').join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </span>
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <form onSubmit={sendMessage} className="chat-input-row">
                    <input
                        ref={inputRef}
                        className="form-input"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={handleInputChange}
                        disabled={sending}
                        style={{ marginBottom: 0, background: 'rgba(255,255,255,.03)', fontSize: '.8125rem' }}
                    />
                    <button
                        type="submit"
                        className="btn-icon"
                        disabled={!newMessage.trim() || sending}
                        style={{
                            flexShrink: 0,
                            background: newMessage.trim() && !sending ? 'var(--grad-primary)' : 'rgba(255,255,255,.04)',
                            color: newMessage.trim() && !sending ? '#fff' : 'var(--text-muted)',
                            border: 'none',
                            boxShadow: newMessage.trim() ? '0 2px 12px var(--primary-glow)' : 'none',
                            transition: 'all .25s ease',
                        }}
                    >
                        <Send size={15} />
                    </button>
                </form>
            </div>
        </div>
    );
}
