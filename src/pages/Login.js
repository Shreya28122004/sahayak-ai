import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password. Please try again.');
        }
        setLoading(false);
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setResetError('');
        if (!resetEmail) {
            return setResetError('Please enter your email address.');
        }
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSent(true);
        } catch (err) {
            setResetError('No account found with this email. Please check and try again.');
        }
        setResetLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-card">

                {/* ===== FORGOT PASSWORD VIEW ===== */}
                {showForgot ? (
                    <>
                        <h2>🔑 Reset Password</h2>
                        <p>Enter your email and we'll send you a reset link.</p>

                        {resetError && <div className="alert alert-error">{resetError}</div>}

                        {resetSent ? (
                            <div>
                                <div className="alert alert-success">
                                    ✅ Password reset email sent to <strong>{resetEmail}</strong>!
                                    Check your inbox and follow the link to reset your password.
                                </div>
                                <button
                                    onClick={() => {
                                        setShowForgot(false);
                                        setResetSent(false);
                                        setResetEmail('');
                                    }}
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                                >
                                    ← Back to Sign In
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword}>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={resetLoading}
                                >
                                    {resetLoading ? (
                                        <><span className="spinner"></span> Sending reset link...</>
                                    ) : (
                                        '📧 Send Reset Link'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgot(false);
                                        setResetError('');
                                        setResetEmail('');
                                    }}
                                    className="btn btn-outline"
                                    style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                                >
                                    ← Back to Sign In
                                </button>
                            </form>
                        )}
                    </>
                ) : (

                    /* ===== NORMAL LOGIN VIEW ===== */
                    <>
                        <h2>🤝 Welcome Back</h2>
                        <p>Sign in to your Sahayak AI account</p>

                        {error && <div className="alert alert-error">{error}</div>}

                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Your password"
                                    required
                                />
                            </div>

                            {/* Forgot Password Link */}
                            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgot(true);
                                        setResetEmail(email);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#1a56db',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        padding: 0,
                                    }}
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner"></span> Signing in...</>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            Don't have an account? <Link to="/register">Create one free</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}