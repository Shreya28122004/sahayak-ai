import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function getPriorityClass(urgency) {
    if (!urgency) return '';
    const u = urgency.toLowerCase();
    if (u === 'critical') return 'critical';
    if (u === 'high') return 'high';
    if (u === 'medium') return 'medium';
    if (u === 'low') return 'low';
    return '';
}

function getPriorityEmoji(urgency) {
    if (!urgency) return '⚪';
    const u = urgency.toLowerCase();
    if (u === 'critical') return '🔴';
    if (u === 'high') return '🟡';
    if (u === 'medium') return '🔵';
    if (u === 'low') return '🟢';
    return '⚪';
}

export default function Dashboard() {
    const { userProfile } = useAuth();
    const [needs, setNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const q = query(
            collection(db, 'needs'),
            orderBy('aiScore', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setNeeds(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const filteredNeeds = needs.filter((need) => {
        if (filter === 'all') return true;
        return need.aiUrgency?.toLowerCase() === filter;
    });

    const stats = {
        total: needs.length,
        critical: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'critical').length,
        high: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'high').length,
        open: needs.filter((n) => n.status === 'open').length,
        completed: needs.filter((n) => n.status === 'completed').length,
        peopleHelped: needs
            .filter((n) => n.status === 'completed')
            .reduce((sum, n) => sum + (n.peopleAffected || 0), 0),
    };

    return (
        <div className="page">
            <Navbar />
            <div className="container">
                <div className="page-title">Welcome, {userProfile?.name || 'User'} 👋</div>
                <p className="page-subtitle">
                    Role: <strong>{userProfile?.role}</strong> — Sahayak AI Dashboard
                </p>

                {/* Stats Row */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-number">{stats.total}</div>
                        <div className="stat-label">Total Needs</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number" style={{ color: '#ef4444' }}>{stats.critical}</div>
                        <div className="stat-label">🔴 Critical</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number" style={{ color: '#f59e0b' }}>{stats.high}</div>
                        <div className="stat-label">🟡 High</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number" style={{ color: '#16a34a' }}>{stats.completed}</div>
                        <div className="stat-label">✅ Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.peopleHelped}</div>
                        <div className="stat-label">People Helped</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                    {userProfile?.role === 'community' && (
                        <Link to="/submit-need" className="btn btn-primary">
                            📋 Submit New Need
                        </Link>
                    )}
                    {userProfile?.role === 'volunteer' && (
                        <Link to="/volunteer-profile" className="btn btn-success">
                            🙋 Update My Profile
                        </Link>
                    )}
                </div>

                {/* Filter Buttons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="btn"
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.85rem',
                                background: filter === f ? '#1a56db' : 'white',
                                color: filter === f ? 'white' : '#374151',
                                border: '1.5px solid #d1d5db',
                                borderRadius: '20px',
                            }}
                        >
                            {f === 'all' && '📋 All'}
                            {f === 'critical' && '🔴 Critical'}
                            {f === 'high' && '🟡 High'}
                            {f === 'medium' && '🔵 Medium'}
                            {f === 'low' && '🟢 Low'}
                        </button>
                    ))}
                </div>

                {/* Needs List */}
                {loading ? (
                    <div className="loading-page">
                        <div style={{ fontSize: '2rem' }}>🤖</div>
                        <p>Loading needs...</p>
                    </div>
                ) : filteredNeeds.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                        <h3>No needs found</h3>
                        <p style={{ color: '#6b7280', marginTop: 8 }}>
                            {filter === 'all'
                                ? 'No community needs have been submitted yet.'
                                : `No ${filter} priority needs found.`}
                        </p>
                        {userProfile?.role === 'community' && (
                            <Link to="/submit-need" className="btn btn-primary" style={{ marginTop: 16 }}>
                                Submit First Need
                            </Link>
                        )}
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: '0.9rem' }}>
                            Showing {filteredNeeds.length} need{filteredNeeds.length !== 1 ? 's' : ''} — sorted by AI priority score
                        </p>
                        {filteredNeeds.map((need) => (
                            <div
                                key={need.id}
                                className={`card need-card ${getPriorityClass(need.aiUrgency)}`}
                                style={{ marginBottom: 16 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: '1.2rem' }}>{getPriorityEmoji(need.aiUrgency)}</span>
                                            <h3 style={{ fontSize: '1.05rem', color: '#1a202c' }}>{need.title}</h3>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                            <span className={`badge badge-${need.aiUrgency?.toLowerCase()}`}>
                                                {need.aiUrgency}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                                📁 {need.category}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                                📍 {need.location}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                                👥 {need.peopleAffected} people
                                            </span>
                                        </div>
                                        <p style={{ color: '#4b5563', fontSize: '0.9rem', marginBottom: 8 }}>
                                            {need.description?.substring(0, 150)}{need.description?.length > 150 ? '...' : ''}
                                        </p>
                                        {need.aiExplanation && (
                                            <div className="ai-box">
                                                <div className="ai-box-title">🤖 Gemini AI Analysis</div>
                                                <p>{need.aiExplanation}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                                        <div style={{
                                            fontSize: '2rem',
                                            fontWeight: '800',
                                            color: need.aiUrgency?.toLowerCase() === 'critical' ? '#ef4444' :
                                                need.aiUrgency?.toLowerCase() === 'high' ? '#f59e0b' :
                                                    need.aiUrgency?.toLowerCase() === 'medium' ? '#3b82f6' : '#22c55e'
                                        }}>
                                            {need.aiScore}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>AI Score</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                                            {need.status === 'completed' ? '✅ Done' : '🔓 Open'}
                                        </div>
                                        {(userProfile?.role === 'ngo') && (
                                            <Link
                                                to={`/need/${need.id}`}
                                                className="btn btn-outline"
                                                style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem' }}
                                            >
                                                View →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}