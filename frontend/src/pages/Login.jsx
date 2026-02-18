import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, FolderKanban, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, register } = useAuth();

    const set = (k, v) => setForm({ ...form, [k]: v });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(form.email, form.password);
            } else {
                await register({
                    email: form.email,
                    password: form.password,
                    first_name: form.first_name,
                    last_name: form.last_name,
                });
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated Orb Background */}
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
            </div>

            {/* Login Card */}
            <div className="login-card">
                {/* Brand */}
                <div className="text-center" style={{ marginBottom: 'var(--sp-xl)' }}>
                    <div className="login-logo">
                        <FolderKanban size={36} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 4 }}>
                        <span className="gradient-text">Luminary</span>
                    </h1>
                    <p className="text-muted text-sm">Next-gen project management</p>
                </div>

                {/* Tabs */}
                <div className="login-tabs">
                    <button
                        className={`login-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(true)}
                        type="button"
                    >
                        <LogIn size={15} /> Sign In
                    </button>
                    <button
                        className={`login-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(false)}
                        type="button"
                    >
                        <UserPlus size={15} /> Sign Up
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,.1)',
                        border: '1px solid rgba(239,68,68,.2)',
                        color: '#fca5a5',
                        padding: 'var(--sp-md)',
                        borderRadius: 'var(--r-lg)',
                        fontSize: '.8125rem',
                        textAlign: 'center',
                        marginBottom: 'var(--sp-lg)',
                        animation: 'slideUp .3s ease',
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="flex gap-md" style={{ marginBottom: 0 }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">First Name</label>
                                <input
                                    className="form-input"
                                    value={form.first_name}
                                    onChange={e => set('first_name', e.target.value)}
                                    required={!isLogin}
                                    placeholder="John"
                                    autoComplete="given-name"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Last Name</label>
                                <input
                                    className="form-input"
                                    value={form.last_name}
                                    onChange={e => set('last_name', e.target.value)}
                                    required={!isLogin}
                                    placeholder="Doe"
                                    autoComplete="family-name"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            className="form-input"
                            type="email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            required
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            required
                            placeholder="••••••••"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                        style={{ marginTop: 'var(--sp-sm)', fontSize: '.9375rem' }}
                    >
                        {loading ? (
                            <div className="spinner spinner-sm" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="text-center" style={{ marginTop: 'var(--sp-xl)' }}>
                    <p className="text-muted text-xs flex-center gap-xs" style={{ justifyContent: 'center' }}>
                        <Sparkles size={12} />
                        Built for teams who ship fast
                    </p>
                </div>
            </div>
        </div>
    );
}
