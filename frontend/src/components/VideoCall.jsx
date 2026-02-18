import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
    Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
    X, User
} from 'lucide-react';
import { useRuntimeConfig } from '../context/RuntimeConfigContext';
import { getBackendUrl } from '../services/config';

AgoraRTC.setLogLevel(3); // warnings only

export default function VideoCall({
    socket, user, onlineUsers = [], projectId,
    onClose, activeCall, onCallStateChange
}) {
    const [isCallActive, setIsCallActive] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);
    const [callError, setCallError] = useState('');
    const [hasRemoteUser, setHasRemoteUser] = useState(false);
    const [agoraStatus, setAgoraStatus] = useState('');

    const { agoraAppId } = useRuntimeConfig();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const clientRef = useRef(null);
    const localTracksRef = useRef({ audioTrack: null, videoTrack: null });
    const durationIntervalRef = useRef(null);
    const channelRef = useRef('');
    const isJoinedRef = useRef(false);
    const isJoiningRef = useRef(false);
    const agoraAppIdRef = useRef('');
    const selectedUserRef = useRef(null);

    // Keep refs in sync
    useEffect(() => {
        if (agoraAppId) agoraAppIdRef.current = agoraAppId;
    }, [agoraAppId]);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // Backend URL helper
    const getBackend = getBackendUrl;

    // ── Leave channel (cleanup Agora resources) ──────────────
    const leaveChannel = useCallback(async () => {
        const { audioTrack, videoTrack } = localTracksRef.current;
        if (audioTrack) { try { audioTrack.stop(); audioTrack.close(); } catch { } }
        if (videoTrack) { try { videoTrack.stop(); videoTrack.close(); } catch { } }
        localTracksRef.current = { audioTrack: null, videoTrack: null };

        if (clientRef.current && isJoinedRef.current) {
            try { await clientRef.current.leave(); } catch { }
            isJoinedRef.current = false;
        }
        isJoiningRef.current = false;
        setHasRemoteUser(false);
    }, []);

    // ── End call cleanup ─────────────────────────────────────
    const endCallCleanup = useCallback(() => {
        leaveChannel();
        setIsCallActive(false);
        setIsCalling(false);
        setSelectedUser(null);
        channelRef.current = '';
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
        setCallDuration(0);
        setAgoraStatus('');
        if (onCallStateChange) onCallStateChange(null);
    }, [leaveChannel, onCallStateChange]);

    // ── Duration timer ───────────────────────────────────────
    const startDurationTimer = useCallback(() => {
        setCallDuration(0);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }, []);

    // ── Join Agora channel ───────────────────────────────────
    const joinChannel = useCallback(async (channel) => {
        try {
            let appId = agoraAppIdRef.current;

            // If still empty, try fetching from backend
            if (!appId) {
                try {
                    setAgoraStatus('Loading config...');
                    const r = await fetch(`${getBackend()}/api/config/runtime`);
                    const d = await r.json();
                    appId = d.agoraAppId || '';
                    agoraAppIdRef.current = appId;
                } catch (e) {
                    console.error('[VideoCall] Config fetch error:', e);
                }
            }

            if (!appId) {
                setCallError('Agora App ID not configured. Add AGORA_APP_ID to .env');
                return;
            }

            const client = clientRef.current;
            if (!client || isJoinedRef.current || isJoiningRef.current) return;
            isJoiningRef.current = true;

            const uid = user?.id || Math.floor(Math.random() * 100000);

            // Fetch Agora token (optional — works without if project is in testing mode)
            setAgoraStatus('Fetching token...');
            let token = null;
            try {
                const tokenRes = await fetch(
                    `${getBackend()}/api/agora/token?channelName=${encodeURIComponent(channel)}&uid=${uid}`
                );
                const tokenData = await tokenRes.json();
                if (tokenData.token) token = tokenData.token;
            } catch (e) {
                console.warn('[VideoCall] Token fetch failed, joining without token:', e);
            }

            setAgoraStatus('Connecting...');
            await client.join(appId, channel, token, uid);
            isJoinedRef.current = true;
            isJoiningRef.current = false;
            setAgoraStatus('Connected ✓');

            // Create local audio + video tracks
            let audioTrack = null;
            let videoTrack = null;
            try {
                [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
                    {}, { encoderConfig: '480p_2', optimizationMode: 'detail' }
                );
            } catch {
                try {
                    audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    setCallError('Camera unavailable — audio only');
                    setTimeout(() => setCallError(''), 4000);
                } catch {
                    setCallError('Cannot access camera or microphone');
                    setTimeout(() => setCallError(''), 5000);
                    return;
                }
            }

            localTracksRef.current = { audioTrack, videoTrack };
            if (videoTrack && localVideoRef.current) {
                videoTrack.play(localVideoRef.current);
            }

            const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
            if (tracksToPublish.length > 0) {
                await client.publish(tracksToPublish);
            }
        } catch (err) {
            isJoiningRef.current = false;
            const msg = err.message || String(err);
            // Suppress harmless duplicate join warnings
            if (msg.includes('already in connecting') || msg.includes('already in connected')) {
                console.warn('[VideoCall] Duplicate join attempt (already connected)');
                return;
            }
            console.error('[VideoCall] Join error:', err);
            setCallError('Connection failed: ' + msg);
            setAgoraStatus('Error');
            setTimeout(() => setCallError(''), 8000);
        }
    }, [user?.id]);

    // ── Agora client setup (once on mount) ───────────────────
    useEffect(() => {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        client.on('connection-state-change', (curState) => {
            setAgoraStatus(curState);
        });

        client.on('user-published', async (remoteUser, mediaType) => {
            setAgoraStatus('Remote user joined!');
            try {
                await client.subscribe(remoteUser, mediaType);
                if (mediaType === 'video') {
                    setHasRemoteUser(true);
                    // Delay slightly to ensure DOM element is ready
                    setTimeout(() => {
                        const container = remoteVideoRef.current;
                        if (container && remoteUser.videoTrack) {
                            remoteUser.videoTrack.play(container);
                        }
                    }, 300);
                }
                if (mediaType === 'audio') {
                    remoteUser.audioTrack?.play();
                }
            } catch (err) {
                console.error('[VideoCall] Subscribe error:', err);
            }
        });

        client.on('user-unpublished', (remoteUser, mediaType) => {
            if (mediaType === 'video') setHasRemoteUser(false);
        });

        client.on('user-left', () => {
            setHasRemoteUser(false);
        });

        return () => {
            leaveChannel();
            client.removeAllListeners();
            clearInterval(durationIntervalRef.current);
        };
    }, [leaveChannel]);

    // ── Socket event listeners ────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleCallAnswered = (data) => {
            setIsCalling(false);
            setIsCallActive(true);
            startDurationTimer();
            const ch = data?.channelName || channelRef.current;
            setTimeout(() => joinChannel(ch), 300);
        };

        const handleCallEnded = () => {
            endCallCleanup();
        };

        const handleCallRejected = (data) => {
            setIsCalling(false);
            setCallError(data?.reason || 'Call was declined');
            setTimeout(() => setCallError(''), 4000);
            leaveChannel();
        };

        const handleCallError = (data) => {
            setIsCalling(false);
            setCallError(data?.message || 'Call failed');
            setTimeout(() => setCallError(''), 4000);
        };

        socket.on('call_answered', handleCallAnswered);
        socket.on('call_ended', handleCallEnded);
        socket.on('call_rejected', handleCallRejected);
        socket.on('call_error', handleCallError);

        return () => {
            socket.off('call_answered', handleCallAnswered);
            socket.off('call_ended', handleCallEnded);
            socket.off('call_rejected', handleCallRejected);
            socket.off('call_error', handleCallError);
        };
    }, [socket, startDurationTimer, joinChannel, endCallCleanup, leaveChannel]);

    // ── Handle incoming call (activeCall prop from parent) ────
    useEffect(() => {
        if (!activeCall) return;
        setIsCallActive(true);
        setSelectedUser({
            first_name: activeCall.callerName?.split(' ')[0] || 'Unknown',
            last_name: activeCall.callerName?.split(' ')[1] || '',
            id: activeCall.callerId,
        });
        channelRef.current = activeCall.channelName;
        startDurationTimer();
        setTimeout(() => joinChannel(activeCall.channelName), 500);
    }, [activeCall, startDurationTimer, joinChannel]);

    // ── Call controls ────────────────────────────────────────
    const startCall = (targetUser) => {
        if (!socket || !user) return;
        setSelectedUser(targetUser);
        setIsCalling(true);
        setCallError('');
        const channel = `call_${projectId}_${Date.now()}`;
        channelRef.current = channel;

        socket.emit('call_user', {
            projectId,
            targetUserId: targetUser.id,
            callerName: `${user.first_name} ${user.last_name}`,
            callerId: user.id,
            channelName: channel,
        });
    };

    const handleEndCall = () => {
        const su = selectedUserRef.current;
        if (socket && su) {
            socket.emit('end_call', { targetUserId: su.id, projectId });
        }
        endCallCleanup();
    };

    const cancelCall = () => {
        const su = selectedUserRef.current;
        if (socket && su) {
            socket.emit('end_call', { targetUserId: su.id, projectId });
        }
        setIsCalling(false);
        setSelectedUser(null);
        channelRef.current = '';
        leaveChannel();
    };

    const toggleMute = () => {
        const { audioTrack } = localTracksRef.current;
        if (audioTrack) {
            audioTrack.setEnabled(isMuted);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        const { videoTrack } = localTracksRef.current;
        if (videoTrack) {
            videoTrack.setEnabled(isVideoOff);
            setIsVideoOff(!isVideoOff);
        }
    };

    const fmtDur = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const otherUsers = onlineUsers.filter(u => u.id !== user?.id);

    /* ═══════════ ACTIVE CALL VIEW ═══════════ */
    if (isCallActive || isCalling) {
        return (
            <div style={{
                width: 360, minWidth: 360, display: 'flex', flexDirection: 'column',
                height: 'calc(100vh - 53px)', background: '#0a0d1a',
                borderLeft: '1px solid var(--glass-border)', position: 'relative',
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--sp-md) var(--sp-lg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.02)',
                }}>
                    <div className="flex gap-sm items-center">
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: isCallActive ? '#10b981' : '#f59e0b',
                            boxShadow: `0 0 8px ${isCallActive ? 'rgba(16,185,129,.5)' : 'rgba(245,158,11,.5)'}`,
                            animation: isCalling ? 'pulse 1.5s infinite' : 'none',
                        }} />
                        <span className="text-sm font-semibold">
                            {isCalling ? 'Calling...' : fmtDur(callDuration)}
                        </span>
                        {selectedUser && (
                            <span className="text-xs text-muted">
                                · {selectedUser.first_name} {selectedUser.last_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Video Area */}
                <div style={{ flex: 1, position: 'relative', background: '#050810', overflow: 'hidden' }}>
                    {/* Remote video */}
                    <div
                        ref={remoteVideoRef}
                        style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#050810' }}
                    >
                        {!hasRemoteUser && (
                            <div className="flex-center flex-col gap-md" style={{ position: 'absolute', inset: 0 }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: 'var(--r-full)',
                                    background: 'rgba(139,92,246,.08)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid rgba(139,92,246,.15)',
                                }}>
                                    <User size={36} style={{ color: '#c4b5fd', opacity: .5 }} />
                                </div>
                                <p className="text-muted text-sm">
                                    {isCalling ? 'Ringing...' : 'Waiting for remote user...'}
                                </p>
                                {isCalling && (
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        border: '2px solid rgba(139,92,246,.3)',
                                        borderTopColor: '#c4b5fd',
                                        animation: 'spin 1s linear infinite',
                                    }} />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Local self-view (picture-in-picture) */}
                    <div
                        ref={localVideoRef}
                        style={{
                            position: 'absolute', bottom: 16, right: 16,
                            width: 140, height: 105, borderRadius: 'var(--r-lg)',
                            border: '2px solid rgba(139,92,246,.2)', overflow: 'hidden',
                            zIndex: 5, background: '#111', boxShadow: 'var(--sh-lg)',
                        }}
                    />

                    {/* Error overlay */}
                    {callError && (
                        <div style={{
                            position: 'absolute', top: 16, left: 16, right: 16,
                            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
                            color: '#fca5a5', padding: 'var(--sp-sm) var(--sp-md)',
                            borderRadius: 'var(--r-lg)', fontSize: '.75rem', textAlign: 'center',
                            backdropFilter: 'blur(8px)',
                        }}>
                            {callError}
                        </div>
                    )}

                    {/* Agora status */}
                    {agoraStatus && (
                        <div style={{
                            position: 'absolute', bottom: 16, left: 16,
                            background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)',
                            padding: '4px 10px', borderRadius: 'var(--r-md)',
                            fontSize: '.65rem', color: '#c4b5fd',
                        }}>
                            {agoraStatus}
                        </div>
                    )}
                </div>

                {/* Call Controls */}
                <div style={{
                    padding: 'var(--sp-lg)', display: 'flex', justifyContent: 'center', gap: 'var(--sp-md)',
                    borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.02)',
                }}>
                    <button onClick={toggleMute} className="btn-icon" title={isMuted ? 'Unmute' : 'Mute'} style={{
                        width: 48, height: 48, borderRadius: 'var(--r-full)',
                        background: isMuted ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
                        border: `1px solid ${isMuted ? 'rgba(239,68,68,.3)' : 'var(--glass-border)'}`,
                        color: isMuted ? '#fca5a5' : 'var(--text)',
                    }}>
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button onClick={toggleVideo} className="btn-icon" title={isVideoOff ? 'Turn on camera' : 'Turn off camera'} style={{
                        width: 48, height: 48, borderRadius: 'var(--r-full)',
                        background: isVideoOff ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
                        border: `1px solid ${isVideoOff ? 'rgba(239,68,68,.3)' : 'var(--glass-border)'}`,
                        color: isVideoOff ? '#fca5a5' : 'var(--text)',
                    }}>
                        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>

                    <button
                        onClick={isCalling ? cancelCall : handleEndCall}
                        className="btn-icon"
                        title={isCalling ? 'Cancel call' : 'End call'}
                        style={{
                            width: 48, height: 48, borderRadius: 'var(--r-full)',
                            background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)',
                            color: '#f87171', transition: 'all .2s ease',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,.3)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,.2)'; }}
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>
            </div>
        );
    }

    /* ═══════════ USER SELECTION VIEW ═══════════ */
    return (
        <div className="video-panel">
            {/* Header */}
            <div style={{
                padding: 'var(--sp-md) var(--sp-lg)', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,.02)',
            }}>
                <div className="flex gap-sm items-center">
                    <div style={{
                        width: 32, height: 32, borderRadius: 'var(--r-lg)',
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(139,92,246,.2)',
                    }}>
                        <Video size={14} color="white" />
                    </div>
                    <h5 style={{ fontSize: '.875rem' }}>Video Call</h5>
                </div>
                <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={onClose}>
                    <X size={14} />
                </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--sp-md)' }}>
                {!agoraAppId && (
                    <div style={{
                        background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
                        borderRadius: 'var(--r-lg)', padding: 'var(--sp-md)',
                        marginBottom: 'var(--sp-md)', fontSize: '.8125rem', color: '#fbbf24',
                    }}>
                        ⚠️ Agora App ID not configured. Add AGORA_APP_ID to .env
                    </div>
                )}

                {callError && (
                    <div style={{
                        background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                        borderRadius: 'var(--r-lg)', padding: 'var(--sp-md)',
                        marginBottom: 'var(--sp-md)', fontSize: '.8125rem', color: '#fca5a5',
                    }}>
                        {callError}
                    </div>
                )}

                {otherUsers.length === 0 ? (
                    <div className="flex-center flex-col gap-md" style={{ padding: 'var(--sp-3xl) var(--sp-md)', opacity: .5 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 'var(--r-xl)',
                            background: 'rgba(139,92,246,.08)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Video size={28} style={{ color: '#c4b5fd' }} />
                        </div>
                        <p className="text-muted text-sm text-center">
                            No members online<br />Invite teammates first
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-muted font-bold" style={{
                            textTransform: 'uppercase', letterSpacing: '1px',
                            marginBottom: 'var(--sp-md)', padding: '0 var(--sp-xs)',
                        }}>
                            Online Members ({otherUsers.length})
                        </p>
                        <div className="flex-col gap-xs">
                            {otherUsers.map(u => (
                                <div
                                    key={u.id}
                                    className="flex items-center gap-sm pointer"
                                    style={{
                                        padding: 'var(--sp-sm) var(--sp-md)',
                                        borderRadius: 'var(--r-lg)',
                                        border: '1px solid var(--glass-border)',
                                        background: 'rgba(255,255,255,.02)',
                                        transition: 'all .25s ease',
                                    }}
                                    onClick={() => startCall(u)}
                                    onMouseOver={e => {
                                        e.currentTarget.style.background = 'rgba(139,92,246,.06)';
                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,.2)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,.02)';
                                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                            {u.first_name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div style={{
                                            position: 'absolute', bottom: -1, right: -1,
                                            width: 10, height: 10, borderRadius: '50%',
                                            background: '#10b981', border: '2px solid #0a0d1a',
                                            boxShadow: '0 0 6px rgba(16,185,129,.5)',
                                        }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="text-sm font-semibold">{u.first_name} {u.last_name}</div>
                                        <div className="text-xs text-muted">Available</div>
                                    </div>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 'var(--r-full)',
                                        background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#c4b5fd',
                                    }}>
                                        <Video size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
