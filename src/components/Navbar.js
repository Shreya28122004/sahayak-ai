import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/');
    }

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                🤝 Sahayak AI
            </Link>
            <div className="navbar-links">
                {currentUser ? (
                    <>
                        <Link to="/dashboard" className="nav-btn">Dashboard</Link>
                        {userProfile?.role === 'community' && (
                            <Link to="/submit-need" className="nav-btn">Submit Need</Link>
                        )}
                        {userProfile?.role === 'volunteer' && (
                            <Link to="/volunteer-profile" className="nav-btn">My Profile</Link>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                            {userProfile?.name} ({userProfile?.role})
                        </span>
                        <button onClick={handleLogout} className="nav-btn danger">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="nav-btn">Login</Link>
                        <Link to="/register" className="nav-btn primary">Get Started</Link>
                    </>
                )}
            </div>
        </nav>
    );
}