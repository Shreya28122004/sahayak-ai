import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc } from 'firebase/firestore';
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
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [need, setNeed] = useState(null);
    const [volunteers, setVolunteers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchLoading, setMatchLoading] = useState(false);
    const [matchError, setMatchError] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [success, setSuccess] = useState('');

    // ✅ NEW: Reject modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

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
        setMatchError('');
        try {
            const volSnap = await getDocs(collection(db, 'volunteers'));
            const freshVolunteers = volSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setVolunteers(freshVolunteers);
            const result = await matchVolunteers(need, freshVolunteers);

            // ✅ CHANGED: map volunteer data first, then sort by matchScore descending
            const matchesWithData = result.matches
                .map((m) => {
                    const volunteer = freshVolunteers[m.volunteerIndex - 1] || freshVolunteers[0];
                    return {
                        ...m,
                        volunteer: volunteer || null,
                    };
                })
                .filter((m) => m.volunteer !== null)
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)); // ✅ Sort highest score first

            setMatches(matchesWithData);
        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('503')) {
                setMatchError('⚠️ Gemini AI is temporarily busy. Please wait 30 seconds and try again.');
            }
        }
        setMatchLoading(false);
    }

    // ✅ CHANGED: now also saves ngoId on the need document
    async function handleAssign(volunteerId, volunteerName) {
        setAssigning(true);
        try {
            await updateDoc(doc(db, 'needs', id), {
                assignedVolunteer: volunteerId,
                assignedVolunteerName: volunteerName,
                status: 'assigned',
                assignedAt: new Date().toISOString(),
                ngoId: currentUser.uid,  // ✅ NEW: save NGO's uid so volunteer can notify them later
            });

            // Write notification to volunteer
            await addDoc(collection(db, 'notifications'), {
                toUserId: volunteerId,
                title: '📋 New Task Assigned',
                message: 'You have been assigned to: ' + need.title,
                needId: id,
                read: false,
                createdAt: new Date().toISOString(),
            });

            setNeed((n) => ({
                ...n,
                assignedVolunteer: volunteerId,
                assignedVolunteerName: volunteerName,
                status: 'assigned',
                ngoId: currentUser.uid,
            }));
            setSuccess('✅ ' + volunteerName + ' has been assigned to this need!');
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
            setSuccess('✅ Need marked as completed! Impact has been tracked.');
            setShowRejectModal(false);
        } catch (err) {
            console.error(err);
        }
    }

    // ✅ CHANGED: opens modal instead of immediately rejecting
    function handleRejectClick() {
        setRejectReason('');
        setShowRejectModal(true);
    }

    // ✅ NEW: Confirm reject — updates Firestore + notifies volunteer
    async function handleRejectConfirm() {
        if (!rejectReason.trim()) return;
        setRejecting(true);
        try {
            await updateDoc(doc(db, 'needs', id), {
                status: 'assigned',
                rejectedAt: new Date().toISOString(),
                completedByVolunteer: false,
                completionNote: '',  // clear old note so volunteer can write a new one
            });

            // ✅ Notify volunteer with rejection reason
            if (need.assignedVolunteer) {
                await addDoc(collection(db, 'notifications'), {
                    toUserId: need.assignedVolunteer,
                    title: '❌ Task Rejected',
                    message: `Your submission for "${need.title}" was rejected. Reason: ${rejectReason.trim()}`,
                    needId: id,
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }

            setNeed((n) => ({ ...n, status: 'assigned', completedByVolunteer: false, completionNote: '' }));
            setSuccess('⚠️ Task sent back to volunteer. Rejection reason sent via notification.');
            setShowRejectModal(false);
            setRejectReason('');
        } catch (err) {
            console.error(err);
        }
        setRejecting(false);
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

                    {/* ✅ Approve / Reject section — now shows completion note */}
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

                            {/* ✅ Show volunteer's completion note + proof photo */}
                            {need.completionNote && (
                                <div style={{
                                    background: 'white',
                                    border: '1px solid #fcd34d',
                                    borderRadius: 8,
                                    padding: '12px 14px',
                                    marginBottom: 14,
                                }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: 6 }}>
                                        📝 Volunteer's Completion Note:
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: 1.6 }}>
                                        {need.completionNote}
                                    </p>
                                    {/* ✅ NEW: Proof photo */}
                                    {need.completionPhoto && (
                                        <div style={{ marginTop: 12 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: 6 }}>
                                                📸 Proof Photo:
                                            </div>
                                            <img
                                                src={need.completionPhoto}
                                                alt="Volunteer proof"
                                                style={{
                                                    width: '100%',
                                                    maxWidth: 360,
                                                    borderRadius: 8,
                                                    border: '1px solid #fcd34d',
                                                    display: 'block',
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <p style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: 12 }}>
                                Please verify the work was completed before approving.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleComplete} className="btn btn-success">
                                    ✅ Approve & Mark Complete
                                </button>
                                {/* ✅ CHANGED: opens modal instead of directly rejecting */}
                                <button onClick={handleRejectClick} className="btn btn-danger">
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

                        {matchError && (
                            <div className="alert alert-warning" style={{ marginTop: 12 }}>
                                {matchError}
                            </div>
                        )}

                        {volunteers.length === 0 && (
                            <div className="alert alert-info" style={{ marginTop: 12 }}>
                                No volunteers registered yet. Ask volunteers to sign up!
                            </div>
                        )}

                        {/* Match Results */}
                        {matches.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <h4 style={{ marginBottom: 12 }}>Top Volunteer Matches:</h4>
                                {matches.map((match, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            border: '1.5px solid',
                                            // ✅ CHANGED: index 0 is now guaranteed to be highest score
                                            borderColor: index === 0 ? '#86efac' : '#e5e7eb',
                                            borderRadius: 10,
                                            padding: 16,
                                            marginBottom: 12,
                                            background: index === 0 ? '#f0fdf4' : 'white',
                                        }}
                                    >
                                        {/* ✅ CHANGED: Best Match always goes to index 0 (sorted highest score) */}
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

            {/* ✅ NEW: Reject Reason Modal */}
            {showRejectModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 20,
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 28,
                        width: '100%',
                        maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: 8, color: '#1a202c' }}>
                            ❌ Reject & Send Back
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 16 }}>
                            The volunteer will be notified with your reason and can resubmit the task.
                        </p>

                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: 6 }}>
                            Reason for rejection <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            rows={4}
                            placeholder="e.g. The task is incomplete — please distribute to 50 more families and resubmit."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                fontSize: '0.9rem',
                                border: '1.5px solid #d1d5db',
                                borderRadius: '8px',
                                resize: 'vertical',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                color: '#374151',
                                marginBottom: 16,
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="btn btn-outline"
                                disabled={rejecting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                className="btn btn-danger"
                                disabled={!rejectReason.trim() || rejecting}
                            >
                                {rejecting ? (
                                    <><span className="spinner"></span> Rejecting...</>
                                ) : (
                                    '❌ Confirm Reject'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}