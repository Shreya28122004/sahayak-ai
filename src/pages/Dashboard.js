import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, getDoc, updateDoc } from 'firebase/firestore';
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
    const { currentUser, userProfile } = useAuth();
    const [needs, setNeeds] = useState([]);
    const [myAssignedNeeds, setMyAssignedNeeds] = useState([]);
    const [volunteerProfile, setVolunteerProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [reviewSuccess, setReviewSuccess] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'needs'),
            orderBy('aiScore', 'desc'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setNeeds(data);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (userProfile?.role === 'volunteer' && currentUser) {
            const assigned = needs.filter(
                (n) => n.assignedVolunteer === currentUser.uid
            );
            setMyAssignedNeeds(assigned);
        }
    }, [needs, userProfile, currentUser]);

    useEffect(() => {
        async function fetchVolunteerProfile() {
            if (userProfile?.role === 'volunteer' && currentUser) {
                try {
                    const docSnap = await getDoc(doc(db, 'volunteers', currentUser.uid));
                    if (docSnap.exists()) {
                        setVolunteerProfile(docSnap.data());
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        }
        fetchVolunteerProfile();
    }, [currentUser, userProfile]);

    async function handleVolunteerComplete(needId) {
        try {
            await updateDoc(doc(db, 'needs', needId), {
                status: 'pending_review',
                volunteerCompletedAt: new Date().toISOString(),
                completedByVolunteer: true,
            });
            // ✅ FIX: Show success message after submit for review
            setReviewSuccess('✅ Submitted! Waiting for NGO approval.');
            setTimeout(() => setReviewSuccess(''), 4000);
        } catch (err) {
            console.error('Error submitting for review:', err);
        }
    }

    // ✅ FIX: Added pending_review case
    const filteredNeeds = needs.filter((need) => {
        if (filter === 'all') return true;
        if (filter === 'open') return need.status === 'open';
        if (filter === 'assigned') return need.status === 'assigned';
        if (filter === 'pending_review') return need.status === 'pending_review';
        if (filter === 'completed') return need.status === 'completed';
        return need.aiUrgency?.toLowerCase() === filter;
    });

    const stats = {
        total: needs.length,
        critical: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'critical').length,
        high: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'high').length,
        open: needs.filter((n) => n.status === 'open').length,
        assigned: needs.filter((n) => n.status === 'assigned').length,
        completed: needs.filter((n) => n.status === 'completed').length,
        peopleHelped: needs
            .filter((n) => n.status === 'completed')
            .reduce((sum, n) => sum + (n.peopleAffected || 0), 0),
        totalPeopleAffected: needs
            .reduce((sum, n) => sum + (n.peopleAffected || 0), 0),
    };

    return (
        <div className="page">
            <Navbar />
            <div className="container">
                <div className="page-title">
                    Welcome, {userProfile?.name || currentUser?.displayName || 'User'} 👋
                </div>
                <p className="page-subtitle">
                    Role: <strong>{userProfile?.role}</strong> — Sahayak AI Dashboard
                </p>

                {/* ===== VOLUNTEER VIEW ===== */}
                {userProfile?.role === 'volunteer' && (
                    <div>
                        <div className="stats-row">
                            <div className="stat-card">
                                <div className="stat-number">{myAssignedNeeds.length}</div>
                                <div className="stat-label">My Assignments</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#16a34a' }}>
                                    {myAssignedNeeds.filter((n) => n.status === 'completed').length}
                                </div>
                                <div className="stat-label">Completed</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">
                                    {myAssignedNeeds
                                        .filter((n) => n.status === 'completed')
                                        .reduce((sum, n) => sum + (n.peopleAffected || 0), 0)}
                                </div>
                                <div className="stat-label">People Helped</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">
                                    {volunteerProfile?.skills?.length || 0}
                                </div>
                                <div className="stat-label">My Skills</div>
                            </div>
                        </div>

                        {!volunteerProfile ? (
                            <div className="alert alert-info" style={{ marginBottom: 20 }}>
                                ⚠️ Your volunteer profile is incomplete!
                                <Link to="/volunteer-profile" className="btn btn-primary" style={{ marginLeft: 16 }}>
                                    Set Up Profile
                                </Link>
                            </div>
                        ) : (
                            <div className="card" style={{ marginBottom: 20, background: '#f0fdf4', border: '1px solid #86efac' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div>
                                        <h3 style={{ color: '#166534', marginBottom: 4 }}>✅ Profile Active</h3>
                                        <p style={{ color: '#166534', fontSize: '0.9rem' }}>
                                            Skills: {volunteerProfile.skills?.join(', ')}
                                        </p>
                                        <p style={{ color: '#166534', fontSize: '0.9rem' }}>
                                            Location: {volunteerProfile.location} | Availability: {volunteerProfile.availability}
                                        </p>
                                    </div>
                                    <Link to="/volunteer-profile" className="btn btn-outline">Edit Profile</Link>
                                </div>
                            </div>
                        )}

                        {/* ✅ FIX: Success message after Submit for Review */}
                        {reviewSuccess && (
                            <div className="alert alert-success" style={{ marginBottom: 16 }}>
                                {reviewSuccess}
                            </div>
                        )}

                        <h3 style={{ marginBottom: 16, fontSize: '1.2rem' }}>📋 My Assigned Tasks</h3>
                        {myAssignedNeeds.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
                                <h3>No tasks assigned yet</h3>
                                <p style={{ color: '#6b7280', marginTop: 8 }}>
                                    NGO coordinators will assign tasks to you based on your skills and location.
                                </p>
                            </div>
                        ) : (
                            myAssignedNeeds.map((need) => (
                                <div
                                    key={need.id}
                                    className={`card need-card ${getPriorityClass(need.aiUrgency)}`}
                                    style={{ marginBottom: 16 }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span>{getPriorityEmoji(need.aiUrgency)}</span>
                                                <h3 style={{ fontSize: '1rem' }}>{need.title}</h3>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                                <span className={`badge badge-${need.aiUrgency?.toLowerCase()}`}>
                                                    {need.aiUrgency}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                                    📍 {need.location}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                                    👥 {need.peopleAffected} people
                                                </span>
                                                <span style={{
                                                    fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px',
                                                    background: need.status === 'completed' ? '#dcfce7' : '#dbeafe',
                                                    color: need.status === 'completed' ? '#166534' : '#1d4ed8'
                                                }}>
                                                    {need.status === 'completed' ? '✅ Completed' : '🔄 In Progress'}
                                                </span>
                                            </div>
                                            <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                                                {need.description?.substring(0, 120)}...
                                            </p>
                                            {need.aiExplanation && (
                                                <div className="ai-box" style={{ marginTop: 8 }}>
                                                    <div className="ai-box-title">🤖 AI Analysis</div>
                                                    <p>{need.aiExplanation}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: 100 }}>
                                            <div style={{
                                                fontSize: '1.5rem', fontWeight: '800',
                                                color: need.status === 'completed' ? '#16a34a' :
                                                    need.status === 'pending_review' ? '#f59e0b' : '#1a56db'
                                            }}>
                                                {need.status === 'completed' ? '✅' :
                                                    need.status === 'pending_review' ? '⏳' : '🔄'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 8 }}>
                                                {need.status === 'completed' ? 'Completed' :
                                                    need.status === 'pending_review' ? 'Awaiting NGO Approval' : 'In Progress'}
                                            </div>
                                            {need.status === 'assigned' && (
                                                <button
                                                    onClick={() => handleVolunteerComplete(need.id)}
                                                    className="btn btn-success"
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                >
                                                    📋 Submit for Review
                                                </button>
                                            )}
                                            {need.status === 'pending_review' && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#f59e0b',
                                                    background: '#fef3c7',
                                                    padding: '6px 10px',
                                                    borderRadius: 8,
                                                    marginTop: 4
                                                }}>
                                                    ⏳ Waiting for NGO to verify
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ===== COMMUNITY MEMBER VIEW ===== */}
                {/* ===== COMMUNITY MEMBER VIEW ===== */}
                {userProfile?.role === 'community' && (
                    <div>
                        {(() => {
                            const myNeeds = needs.filter((n) => n.submittedBy === currentUser?.uid);
                            const myInProgress = myNeeds.filter((n) => n.status === 'assigned' || n.status === 'pending_review').length;
                            const myResolved = myNeeds.filter((n) => n.status === 'completed').length;
                            const myPeopleHelped = myNeeds
                                .filter((n) => n.status === 'completed')
                                .reduce((sum, n) => sum + (n.peopleAffected || 0), 0);

                            return (
                                <>
                                    <div className="stats-row">
                                        <div className="stat-card">
                                            <div className="stat-number">{myNeeds.length}</div>
                                            <div className="stat-label">📋 My Submissions</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-number" style={{ color: '#3b82f6' }}>{myInProgress}</div>
                                            <div className="stat-label">🔄 In Progress</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-number" style={{ color: '#16a34a' }}>{myResolved}</div>
                                            <div className="stat-label">✅ Resolved</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-number" style={{ color: '#8b5cf6' }}>{myPeopleHelped}</div>
                                            <div className="stat-label">👥 People Helped</div>
                                        </div>
                                    </div>

                                    {myPeopleHelped > 0 && (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                            color: 'white',
                                            borderRadius: 12,
                                            padding: '20px 24px',
                                            marginBottom: 24,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16,
                                        }}>
                                            <div style={{ fontSize: '2.5rem' }}>🌟</div>
                                            <div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                                                    Your reports helped {myPeopleHelped} people!
                                                </div>
                                                <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>
                                                    {myResolved} of your {myNeeds.length} submissions have been resolved
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: 24 }}>
                                        <Link to="/submit-need" className="btn btn-primary">
                                            📋 Submit New Need
                                        </Link>
                                    </div>

                                    <h3 style={{ marginBottom: 16 }}>My Submitted Needs</h3>
                                    {myNeeds.length === 0 ? (
                                        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                                            <h3>No needs submitted yet</h3>
                                            <p style={{ color: '#6b7280', marginTop: 8 }}>
                                                Submit your first community need and AI will score its urgency.
                                            </p>
                                            <Link to="/submit-need" className="btn btn-primary" style={{ marginTop: 16 }}>
                                                Submit First Need
                                            </Link>
                                        </div>
                                    ) : (
                                        myNeeds.map((need) => (
                                            <div
                                                key={need.id}
                                                className={`card need-card ${getPriorityClass(need.aiUrgency)}`}
                                                style={{ marginBottom: 16 }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                            <span>{getPriorityEmoji(need.aiUrgency)}</span>
                                                            <h3 style={{ fontSize: '1rem' }}>{need.title}</h3>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                                            <span className={`badge badge-${need.aiUrgency?.toLowerCase()}`}>
                                                                {need.aiUrgency}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px',
                                                                background: need.status === 'completed' ? '#dcfce7' :
                                                                    need.status === 'assigned' ? '#dbeafe' :
                                                                        need.status === 'pending_review' ? '#fef3c7' : '#fef3c7',
                                                                color: need.status === 'completed' ? '#166534' :
                                                                    need.status === 'assigned' ? '#1d4ed8' :
                                                                        need.status === 'pending_review' ? '#92400e' : '#92400e'
                                                            }}>
                                                                {need.status === 'completed' ? '✅ Resolved' :
                                                                    need.status === 'assigned' ? '🔄 In Progress' :
                                                                        need.status === 'pending_review' ? '⏳ Under Review' : '🔓 Open'}
                                                            </span>
                                                        </div>
                                                        {need.aiExplanation && (
                                                            <div className="ai-box">
                                                                <div className="ai-box-title">🤖 AI Analysis</div>
                                                                <p>{need.aiExplanation}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                                                        <div style={{
                                                            fontSize: '2rem', fontWeight: '800',
                                                            color: need.aiUrgency?.toLowerCase() === 'critical' ? '#ef4444' :
                                                                need.aiUrgency?.toLowerCase() === 'high' ? '#f59e0b' :
                                                                    need.aiUrgency?.toLowerCase() === 'medium' ? '#3b82f6' : '#22c55e'
                                                        }}>
                                                            {need.aiScore}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>AI Score</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* ===== NGO COORDINATOR VIEW ===== */}
                {userProfile?.role === 'ngo' && (
                    <div>
                        <div className="stats-row">
                            <div className="stat-card">
                                <div className="stat-number">{stats.total}</div>
                                <div className="stat-label">📋 Total Needs</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#f59e0b' }}>{stats.open}</div>
                                <div className="stat-label">🔓 Open</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#3b82f6' }}>{stats.assigned}</div>
                                <div className="stat-label">🔄 Assigned</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#f59e0b' }}>
                                    {needs.filter((n) => n.status === 'pending_review').length}
                                </div>
                                <div className="stat-label">⏳ Pending Review</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#16a34a' }}>{stats.completed}</div>
                                <div className="stat-label">✅ Completed</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number" style={{ color: '#8b5cf6' }}>{stats.peopleHelped}</div>
                                <div className="stat-label">👥 People Helped</div>
                            </div>
                        </div>

                        {stats.peopleHelped > 0 && (
                            <div style={{
                                background: 'linear-gradient(135deg, #1a56db, #0d3b8e)',
                                color: 'white',
                                borderRadius: 12,
                                padding: '20px 24px',
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                            }}>
                                <div style={{ fontSize: '2.5rem' }}>🌍</div>
                                <div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>
                                        {stats.peopleHelped} people helped so far!
                                    </div>
                                    <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>
                                        {stats.completed} needs resolved out of {stats.total} total
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            {['all', 'critical', 'high', 'medium', 'low', 'open', 'assigned', 'pending_review', 'completed'].map((f) => (
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
                                    {f === 'open' && '🔓 Open'}
                                    {f === 'assigned' && '🔄 Assigned'}
                                    {f === 'pending_review' && '⏳ Pending Review'}
                                    {f === 'completed' && '✅ Completed'}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="loading-page"><p>Loading needs...</p></div>
                        ) : filteredNeeds.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
                                <h3>No needs found</h3>
                                <p style={{ color: '#6b7280', marginTop: 8 }}>No community needs match this filter yet.</p>
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
                                                    <span style={{
                                                        fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px',
                                                        background: need.status === 'completed' ? '#dcfce7' :
                                                            need.status === 'pending_review' ? '#fef3c7' :
                                                                need.status === 'assigned' ? '#dbeafe' : '#fef3c7',
                                                        color: need.status === 'completed' ? '#166534' :
                                                            need.status === 'pending_review' ? '#92400e' :
                                                                need.status === 'assigned' ? '#1d4ed8' : '#92400e'
                                                    }}>
                                                        {need.status === 'completed' ? '✅ Completed' :
                                                            need.status === 'pending_review' ? '⏳ Pending Review' :
                                                                need.status === 'assigned' ? '🔄 Assigned' : '🔓 Open'}
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
                                                {need.assignedVolunteerName && (
                                                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#1d4ed8' }}>
                                                        👤 Assigned to: <strong>{need.assignedVolunteerName}</strong>
                                                    </p>
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 80 }}>
                                                <div style={{
                                                    fontSize: '2rem', fontWeight: '800',
                                                    color: need.aiUrgency?.toLowerCase() === 'critical' ? '#ef4444' :
                                                        need.aiUrgency?.toLowerCase() === 'high' ? '#f59e0b' :
                                                            need.aiUrgency?.toLowerCase() === 'medium' ? '#3b82f6' : '#22c55e'
                                                }}>
                                                    {need.aiScore}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>AI Score</div>
                                                <Link
                                                    to={`/need/${need.id}`}
                                                    className="btn btn-outline"
                                                    style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem' }}
                                                >
                                                    Manage →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}