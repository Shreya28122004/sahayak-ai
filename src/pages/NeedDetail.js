import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { matchVolunteers } from '../services/gemini';
import Navbar from '../components/Navbar';

function getPriorityColor(urgency) {
    if (!urgency) return '#6b7280';
    const u = urgency.toLowerCase();
    if (u === 'critical') return '#ef4444';
    if (u === 'high') return '#f59e0b';
    if (u === 'medium') return '#3b82f6';
    if (u === 'low') return '#22c55e';
    return '#6b7280';
}

export default function NeedDetail() {
    const { id } = useParams();
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [need, setNeed] = useState(null);
    const [volunteers, setVolunteers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchLoading, setMatchLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const needDoc = await getDoc(doc(db, 'needs', id));
                if (needDoc.exists()) {
                    setNeed({ id: needDoc.id, ...needDoc.data() });
                }
                const volSnap = await getDocs(collection(db, 'volunteers'));
                const volData = volSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setVolunteers(volData);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        fetchData();
    }, [id]);

    async function handleMatch() {
        if (volunteers.length === 0) return;
        setMatchLoading(true);
        setMatches([]);
        try {
            const volSnap = await getDocs(collection(db, 'volunteers'));
            const freshVolunteers = volSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setVolunteers(freshVolunteers);
            const result = await matchVolunteers(need, freshVolunteers);
            const matchesWithData = result.matches
                .map((m) => {
                    const volunteer = freshVolunteers[m.volunteerIndex] || freshVolunteers[0];
                    return {
                        ...m,
                        volunteer: volunteer || null,
                    };
                })
                .filter((m) => m.volunteer !== null);
            setMatches(matchesWithData);
        } catch (err) {
            console.error(err);
        }
        setMatchLoading(false);
    }

    async function handleAssign(volunteerId, volunteerName) {
        setAssigning(true);
        try {
            await updateDoc(doc(db, 'needs', id), {
                assignedVolunteer: volunteerId,
                assignedVolunteerName: volunteerName,
                status: 'assigned',
                assignedAt: new Date().toISOString(),
            });
            setNeed((n) => ({
                ...n,
                assignedVolunteer: volunteerId,
                assignedVolunteerName: volunteerName,
                status: 'assigned',
            }));
            setSuccess(volunteerName + ' has been assigned to this need!');
        } catch (err) {
            console.error(err);
        }
        setAssigning(false);
    }

    async function handleComplete() {
        try {
            await updateDoc(doc(db, 'needs', id), {
                status: 'completed',
                completedAt: new Date().toISOString(),
            });
            setNeed((n) => ({ ...n, status: 'completed' }));
            setSuccess('Need marked as completed! Impact tracked. ✅');
        } catch (err) {
            console.error(err);
        }
    }
    async function handleReject() {
        try {
            await updateDoc(doc(db, 'needs', id), {
                status: 'assigned',
                rejectedAt: new Date().toISOString(),
                completedByVolunteer: false,
            });
            setNeed((n) => ({ ...n, status: 'assigned', completedByVolunteer: false }));
            setSuccess('Task sent back to volunteer for re-completion.');
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) {
        return (
            <div className="page">
                <Navbar />
                <div className="loading-page">
                    <p>Loading need details...</p>
                </div>
            </div>
        );
    }

    if (!need) {
        return (
            <div className="page">
                <Navbar />
                <div className="container">
                    <p>Need not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <Navbar />
            <div className="container" style={{ maxWidth: 800 }}>

                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-outline"
                    style={{ marginBottom: 20 }}
                >
                    ← Back to Dashboard
                </button>

                {success && (
                    <div className="alert alert-success">{success}</div>
                )}

                {/* Need Details Card */}
                <div
                    className="card"
                    style={{
                        borderLeft: '5px solid ' + getPriorityColor(need.aiUrgency),
                        marginBottom: 20,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>{need.title}</h2>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                <span className={'badge badge-' + (need.aiUrgency ? need.aiUrgency.toLowerCase() : '')}>
                                    {need.aiUrgency}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                    📁 {need.category}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                    📍 {need.location}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280', padding: '4px 8px', background: '#f3f4f6', borderRadius: '12px' }}>
                                    👥 {need.peopleAffected} people affected
                                </span>
                                <span style={{
                                    fontSize: '0.85rem', padding: '4px 8px', borderRadius: '12px',
                                    background: need.status === 'completed' ? '#dcfce7' : need.status === 'assigned' ? '#dbeafe' : '#fef3c7',
                                    color: need.status === 'completed' ? '#166534' : need.status === 'assigned' ? '#1d4ed8' : '#92400e'
                                }}>
                                    {need.status === 'completed' ? '✅ Completed' : need.status === 'assigned' ? '🔄 Assigned' : '🔓 Open'}
                                </span>
                            </div>
                            <p style={{ color: '#4b5563', lineHeight: 1.7 }}>{need.description}</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: '800',
                                color: getPriorityColor(need.aiUrgency)
                            }}>
                                {need.aiScore}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>AI Score</div>
                        </div>
                    </div>

                    {/* AI Explanation */}
                    {need.aiExplanation && (
                        <div className="ai-box" style={{ marginTop: 16 }}>
                            <div className="ai-box-title">🤖 Gemini AI Explanation</div>
                            <p>{need.aiExplanation}</p>
                        </div>
                    )}

                    {/* Assigned Volunteer */}
                    {need.assignedVolunteerName && (
                        <div className="alert alert-info" style={{ marginTop: 16 }}>
                            👤 Assigned to: <strong>{need.assignedVolunteerName}</strong>
                        </div>
                    )}

                    {/* Submitted By */}
                    <p style={{ marginTop: 12, fontSize: '0.8rem', color: '#9ca3af' }}>
                        Submitted by: {need.submittedByName} •{' '}
                        {need.createdAt ? new Date(need.createdAt).toLocaleDateString() : ''}
                    </p>

                    {/* Mark Complete Button */}
                    {userProfile?.role === 'ngo' && need.status === 'pending_review' && (
                        <div style={{
                            background: '#fef3c7',
                            border: '1px solid #f59e0b',
                            borderRadius: 10,
                            padding: 16,
                            marginTop: 16
                        }}>
                            <div style={{ fontWeight: '700', color: '#92400e', marginBottom: 8 }}>
                                ⏳ Volunteer has submitted this task for review
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: 12 }}>
                                Please verify the work was completed before approving.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleComplete} className="btn btn-success">
                                    ✅ Approve & Mark Complete
                                </button>
                                <button onClick={handleReject} className="btn btn-danger">
                                    ❌ Reject — Send Back
                                </button>
                            </div>
                        </div>
                    )}

                    {userProfile?.role === 'ngo' && need.status === 'assigned' && (
                        <div style={{ marginTop: 16 }}>
                            <button onClick={handleComplete} className="btn btn-success">
                                ✅ Mark as Completed
                            </button>
                        </div>
                    )}
                </div>

                {/* Smart Volunteer Matching */}
                {userProfile?.role === 'ngo' && need.status !== 'completed' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 8 }}>🎯 Smart Volunteer Matching</h3>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: '0.9rem' }}>
                            Gemini AI will analyze {volunteers.length} registered volunteer{volunteers.length !== 1 ? 's' : ''} and suggest the best matches for this need.
                        </p>

                        <button
                            onClick={handleMatch}
                            className="btn btn-primary"
                            disabled={matchLoading || volunteers.length === 0}
                        >
                            {matchLoading ? (
                                <><span className="spinner"></span> Finding best matches...</>
                            ) : (
                                '🤖 Find Best Volunteers with AI'
                            )}
                        </button>

                        {volunteers.length === 0 && (
                            <div className="alert alert-info" style={{ marginTop: 12 }}>
                                No volunteers registered yet. Ask volunteers to sign up!
                            </div>
                        )}

                        {/* Match Results */}
                        {matches.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <h4 style={{ marginBottom: 12 }}>
                                    Top Volunteer Matches:
                                </h4>
                                {matches.map((match, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            border: '1.5px solid',
                                            borderColor: index === 0 ? '#86efac' : '#e5e7eb',
                                            borderRadius: 10,
                                            padding: 16,
                                            marginBottom: 12,
                                            background: index === 0 ? '#f0fdf4' : 'white',
                                        }}
                                    >
                                        {index === 0 && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                color: '#16a34a',
                                                marginBottom: 8,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                ⭐ Best Match
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <strong style={{ fontSize: '1rem' }}>
                                                        {match.volunteer?.name || 'Volunteer'}
                                                    </strong>
                                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        📍 {match.volunteer?.location || ''}
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        🕐 {match.volunteer?.availability || ''}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                                    {match.volunteer?.skills?.map((skill) => (
                                                        <span key={skill} className="badge badge-medium" style={{ fontSize: '0.75rem' }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="ai-box">
                                                    <div className="ai-box-title">🤖 Why this volunteer?</div>
                                                    <p>{match.reason}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center', minWidth: 80 }}>
                                                <div style={{
                                                    fontSize: '2rem',
                                                    fontWeight: '800',
                                                    color: '#1a56db'
                                                }}>
                                                    {match.matchScore}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 8 }}>
                                                    Match Score
                                                </div>
                                                <button
                                                    onClick={() => handleAssign(
                                                        match.volunteer?.id || '',
                                                        match.volunteer?.name || ''
                                                    )}
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                    disabled={assigning || need.status === 'assigned'}
                                                >
                                                    {need.assignedVolunteer === match.volunteer?.id
                                                        ? '✅ Assigned'
                                                        : 'Assign'}
                                                </button>
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