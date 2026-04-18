import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Landing() {
    return (
        <div className="page">
            <Navbar />
            <div className="hero">
                <h1>🤝 Sahayak AI</h1>
                <p>
                    Intelligent Volunteer Coordination for Social Impact — powered by
                    Google Gemini AI
                </p>
                <div className="hero-buttons">
                    <Link
                        to="/register"
                        className="btn"
                        style={{
                            background: 'white',
                            color: '#1a56db',
                            fontWeight: '700',
                            padding: '12px 28px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                        }}
                    >
                        Get Started Free
                    </Link>
                    <Link
                        to="/login"
                        className="btn"
                        style={{
                            background: 'transparent',
                            color: 'white',
                            fontWeight: '700',
                            padding: '12px 28px',
                            borderRadius: '8px',
                            border: '2px solid white',
                            textDecoration: 'none',
                        }}
                    >
                        Sign In
                    </Link>
                </div>
            </div>

            <div className="features-section">
                <h2>Connecting Communities with Volunteers</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">📋</div>
                        <h3>Submit Community Needs</h3>
                        <p>Community members report urgent needs — from food shortages to medical help.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🤖</div>
                        <h3>AI Priority Scoring</h3>
                        <p>Gemini AI analyzes and scores needs by urgency so the most critical are addressed first.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Smart Volunteer Matching</h3>
                        <p>AI matches the right volunteers to the right tasks based on skills and location.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Impact Tracking</h3>
                        <p>Track tasks completed and people helped in real time across your community.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💡</div>
                        <h3>Explainable AI</h3>
                        <p>Understand exactly why a need was prioritized with transparent AI explanations.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🌍</div>
                        <h3>Built for NGOs</h3>
                        <p>Designed for NGO coordinators to manage volunteers and community response efficiently.</p>
                    </div>
                </div>
            </div>

            <div
                style={{
                    background: '#1a56db',
                    color: 'white',
                    padding: '60px 20px',
                    textAlign: 'center',
                }}
            >
                <h2 style={{ marginBottom: 12, fontSize: '2rem' }}>Three Roles, One Mission</h2>
                <p style={{ opacity: 0.85, marginBottom: 32, fontSize: '1rem' }}>
                    Everyone plays a part in building a stronger community
                </p>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 40,
                        flexWrap: 'wrap',
                        marginTop: 24,
                    }}
                >
                    {[
                        { icon: '👥', role: 'Community Member', desc: 'Report needs in your area' },
                        { icon: '🏢', role: 'NGO Coordinator', desc: 'Manage volunteers & assignments' },
                        { icon: '🙋', role: 'Volunteer', desc: 'Register skills & take on tasks' },
                    ].map((r) => (
                        <div
                            key={r.role}
                            style={{
                                maxWidth: 200,
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 12,
                                padding: '24px 20px',
                            }}
                        >
                            <div style={{ fontSize: '2.5rem' }}>{r.icon}</div>
                            <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem' }}>{r.role}</h3>
                            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>{r.desc}</p>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 40 }}>
                    <Link
                        to="/register"
                        style={{
                            background: 'white',
                            color: '#1a56db',
                            fontWeight: '700',
                            padding: '14px 36px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '1rem',
                        }}
                    >
                        Join Sahayak AI Today →
                    </Link>
                </div>
            </div>
        </div>
    );
}