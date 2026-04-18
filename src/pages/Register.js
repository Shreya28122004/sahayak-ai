import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'community' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        setLoading(true);
        try {
            await register(form.email, form.password, form.name, form.role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Registration failed. Try again.');
        }
        setLoading(false);
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>🤝 Join Sahayak AI</h2>
                <p>Create your account and start making an impact</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
                    </div>
                    <div className="form-group">
                        <label>I am a...</label>
                        <select name="role" value={form.role} onChange={handleChange}>
                            <option value="community">👥 Community Member — I want to report needs</option>
                            <option value="ngo">🏢 NGO Coordinator — I manage volunteers</option>
                            <option value="volunteer">🙋 Volunteer — I want to help</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? <><span className="spinner"></span> Creating account...</> : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}