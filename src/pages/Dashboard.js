import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { userProfile } = useAuth();

    return (
        <div className="page">
            <Navbar />
            <div className="container">
                <div className="page-title">
                    Welcome, {userProfile?.name || 'User'} 👋
                </div>
                <p className="page-subtitle">
                    Role: <strong>{userProfile?.role}</strong> — Your Sahayak AI dashboard
                </p>

                <div className="alert alert-success">
                    ✅ Day 1 Complete! Firebase Auth is working. Full dashboard coming on Day 3.
                </div>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-number">0</div>
                        <div className="stat-label">Active Needs</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">0</div>
                        <div className="stat-label">Volunteers</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">0</div>
                        <div className="stat-label">Tasks Done</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">0</div>
                        <div className="stat-label">People Helped</div>
                    </div>
                </div>

                <div className="two-col">
                    {userProfile?.role === 'community' && (
                        <div className="card">
                            <h3>📋 Submit a Community Need</h3>
                            <p style={{ color: '#6b7280', margin: '8px 0 16px' }}>
                                Report a need in your community and our AI will score its urgency.
                            </p>
                            <Link to="/submit-need" className="btn btn-primary">Submit Need</Link>
                        </div>
                    )}
                    {userProfile?.role === 'volunteer' && (
                        <div className="card">
                            <h3>🙋 Your Volunteer Profile</h3>
                            <p style={{ color: '#6b7280', margin: '8px 0 16px' }}>
                                Set up your skills and availability so NGOs can find you.
                            </p>
                            <Link to="/volunteer-profile" className="btn btn-success">Set Up Profile</Link>
                        </div>
                    )}
                    {userProfile?.role === 'ngo' && (
                        <div className="card">
                            <h3>🏢 Coordinator Tools</h3>
                            <p style={{ color: '#6b7280', margin: '8px 0 16px' }}>
                                View all needs, assign volunteers, and track impact.
                            </p>
                            <span className="badge badge-high">Coming Day 3</span>
                        </div>
                    )}
                    <div className="card">
                        <h3>🤖 AI Features</h3>
                        <p style={{ color: '#6b7280', margin: '8px 0 16px' }}>
                            Gemini AI priority scoring and volunteer matching are ready.
                        </p>
                        <span className="badge badge-medium">Coming Day 2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}