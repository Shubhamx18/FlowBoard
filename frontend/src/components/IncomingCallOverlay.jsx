import { Phone, PhoneOff, User } from 'lucide-react';

export default function IncomingCallOverlay({ caller, onAccept, onReject }) {
    if (!caller) return null;

    return (
        <div className="modal-overlay">
            <div className="card-glass animate-slide-up" style={{ maxWidth: 380, width: '90%', textAlign: 'center' }}>
                <div style={{ marginBottom: 'var(--sp-xl)' }}>
                    <div className="flex-center" style={{ marginBottom: 'var(--sp-md)' }}>
                        <div className="avatar avatar-lg animate-pulse" style={{ background: 'var(--grad-secondary)' }}>
                            {caller.callerName?.[0]?.toUpperCase() || <User size={24} />}
                        </div>
                    </div>
                    <h3 style={{ marginBottom: 'var(--sp-xs)' }}>Incoming Call</h3>
                    <p className="text-muted">{caller.callerName || 'Someone'} is calling you</p>
                </div>

                <div className="flex-center gap-lg">
                    <button
                        onClick={onReject}
                        className="btn btn-danger"
                        style={{ borderRadius: 'var(--r-full)', width: 56, height: 56, padding: 0 }}
                    >
                        <PhoneOff size={22} />
                    </button>
                    <button
                        onClick={onAccept}
                        className="btn"
                        style={{ borderRadius: 'var(--r-full)', width: 56, height: 56, padding: 0, background: 'var(--grad-green)', color: '#fff' }}
                    >
                        <Phone size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}
