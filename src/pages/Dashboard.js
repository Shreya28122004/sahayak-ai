import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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

    // ✅ CHANGED: filters is now an array for multi-select
    const [filters, setFilters] = useState([]);

    const [reviewSuccess, setReviewSuccess] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ NEW: Proof of completion notes + photos — keyed by need.id
    const [completionNotes, setCompletionNotes] = useState({});
    const [completionPhotos, setCompletionPhotos] = useState({}); // stores base64 strings
    const [submittingIds, setSubmittingIds] = useState([]);

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

    // ✅ CHANGED: toggle a filter in/out of the array
    function toggleFilter(f) {
        setFilters((prev) =>
            prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
        );
    }
    // Replacement for Line 20: NGO Multi-select remains the same
    function toggleFilter(f) {
        setFilters((prev) =>
            prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
        );
    }

    // NEW: Exclusive toggle for Community View (One at a time)
    function toggleCommunityFilter(f) {
        setFilters((prev) => {
            if (prev.includes(f)) return []; // Toggle off if clicked again
            return [f]; // Only allow one active filter
        });
    }

    // NEW: Delete Function
    async function handleDeleteNeed(id) {
        if (window.confirm("Are you sure you want to delete this need?")) {
            try {
                await deleteDoc(doc(db, 'needs', id));
            } catch (err) {
                console.error("Error deleting need:", err);
            }
        }
    }


    function clearFilters() {
        setFilters([]);
    }
    // Line 22: Add your function here
    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'sahayak_preset');
        formData.append('cloud_name', 'dypkq2hkv');

        const response = await fetch(`https://api.cloudinary.com/v1_1/dypkq2hkv/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.secure_url;
    }

    // ✅ NEW: Submit for review with completion note
    async function handleVolunteerComplete(need) {
        const note = completionNotes[need.id] || '';
        if (!note.trim()) return; // button is disabled anyway, but safety check

        setSubmittingIds((prev) => [...prev, need.id]);
        try {
            await updateDoc(doc(db, 'needs', need.id), {
                status: 'pending_review',
                volunteerCompletedAt: new Date().toISOString(),
                completedByVolunteer: true,
                completionNote: note.trim(),
                completionPhoto: completionPhotos[need.id] || '',
            });

            // ✅ Write notification to NGO if ngoId is on the need
            if (need.ngoId) {
                await addDoc(collection(db, 'notifications'), {
                    toUserId: need.ngoId,
                    title: '⏳ Pending Review',
                    message: `${userProfile?.name || 'A volunteer'} has submitted "${need.title}" for your review.`,
                    needId: need.id,
                    read: false,
                    createdAt: new Date().toISOString(),
                });
            }

            setReviewSuccess('✅ Submitted! Waiting for NGO approval.');
            setTimeout(() => setReviewSuccess(''), 4000);
            // Clear the note and photo for this need
            setCompletionNotes((prev) => { const next = { ...prev }; delete next[need.id]; return next; });
            setCompletionPhotos((prev) => { const next = { ...prev }; delete next[need.id]; return next; });
        } catch (err) {
            console.error('Error submitting for review:', err);
        }
        setSubmittingIds((prev) => prev.filter((x) => x !== need.id));
    }

    // ✅ CHANGED: filter by multiple selected filters (OR logic)
    const filteredNeeds = needs.filter((need) => {
        const matchesFilter = (() => {
            if (filters.length === 0) return true; // nothing selected = show all
            return filters.some((f) => {
                if (f === 'open') return need.status === 'open';
                if (f === 'assigned') return need.status === 'assigned';
                if (f === 'pending_review') return need.status === 'pending_review';
                if (f === 'completed') return need.status === 'completed';
                return need.aiUrgency?.toLowerCase() === f;
            });
        })();

        const q = searchQuery.toLowerCase();
        const matchesSearch = q === '' ||
            need.title?.toLowerCase().includes(q) ||
            need.description?.toLowerCase().includes(q) ||
            need.location?.toLowerCase().includes(q);

        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: needs.length,
        critical: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'critical').length,
        high: needs.filter((n) => n.aiUrgency?.toLowerCase() === 'high').length,
        open: needs.filter((n) => n.status === 'open').length,
        assigned: needs.filter((n) => n.status === 'assigned').length,
        completed: needs.filter((n) => n.status === 'completed').length,
        pendingReview: needs.filter((n) => n.status === 'pending_review').length,
        peopleHelped: needs
            .filter((n) => n.status === 'completed')
            .reduce((sum, n) => sum + (n.peopleAffected || 0), 0),
    };

    // ✅ Filter button config for NGO
    const filterButtons = [
        { key: 'critical', label: '🔴 Critical' },
        { key: 'high', label: '🟡 High' },
        { key: 'medium', label: '🔵 Medium' },
        { key: 'low', label: '🟢 Low' },
        { key: 'open', label: '🔓 Open' },
        { key: 'assigned', label: '🔄 Assigned' },
        { key: 'pending_review', label: '⏳ Pending Review' },
        { key: 'completed', label: '✅ Completed' },
    ];

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
                                                    background: need.status === 'completed' ? '#dcfce7' :
                                                        need.status === 'pending_review' ? '#fef3c7' : '#dbeafe',
                                                    color: need.status === 'completed' ? '#166534' :
                                                        need.status === 'pending_review' ? '#92400e' : '#1d4ed8'
                                                }}>
                                                    {need.status === 'completed' ? '✅ Completed' :
                                                        need.status === 'pending_review' ? '⏳ Awaiting Review' : '🔄 In Progress'}
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

                                            {/* ✅ NEW: Proof of completion text area — only show when status is assigned */}
                                            {/* ✅ Wrap both the Note and the Photo inside the same conditional block */}
                                            {need.status === 'assigned' && (
                                                <>
                                                    <div style={{ marginTop: 12 }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: 6 }}>
                                                            📝 Completion Note <span style={{ color: '#ef4444' }}>*</span>
                                                        </label>
                                                        <textarea
                                                            rows={3}
                                                            placeholder="Describe what you did, how many people helped, any notes for the NGO..."
                                                            value={completionNotes[need.id] || ''}
                                                            onChange={(e) =>
                                                                setCompletionNotes((prev) => ({ ...prev, [need.id]: e.target.value }))
                                                            }
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                fontSize: '0.88rem',
                                                                border: '1.5px solid #d1d5db',
                                                                borderRadius: '8px',
                                                                resize: 'vertical',
                                                                outline: 'none',
                                                                boxSizing: 'border-box',
                                                                fontFamily: 'inherit',
                                                                color: '#374151',
                                                            }}
                                                            onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                                                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                        />
                                                        <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 4 }}>
                                                            Required before submitting for review
                                                        </p>
                                                    </div>

                                                    {/* ✅ The photo upload is now safely inside the conditional block */}
                                                    <div style={{ marginTop: 12 }}>
                                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: 6 }}>
                                                            📸 Proof Photo <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: '400' }}>(optional)</span>
                                                        </label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            id={`photo-${need.id}`}
                                                            style={{ display: 'none' }}
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                try {
                                                                    const imageUrl = await uploadToCloudinary(file);
                                                                    setCompletionPhotos((prev) => ({ ...prev, [need.id]: imageUrl }));
                                                                } catch (err) {
                                                                    console.error('Upload failed', err);
                                                                }
                                                            }}
                                                        />
                                                        {completionPhotos[need.id] ? (
                                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                <img
                                                                    src={completionPhotos[need.id]}
                                                                    alt="Proof"
                                                                    style={{ width: '100%', maxWidth: 280, borderRadius: 8, border: '1.5px solid #d1d5db', display: 'block' }}
                                                                />
                                                                <button
                                                                    onClick={() => setCompletionPhotos((prev) => { const next = { ...prev }; delete next[need.id]; return next; })}
                                                                    style={{
                                                                        position: 'absolute', top: 6, right: 6,
                                                                        background: 'rgba(0,0,0,0.6)', color: 'white',
                                                                        border: 'none', borderRadius: '50%',
                                                                        width: 24, height: 24, cursor: 'pointer',
                                                                        fontSize: '0.8rem', display: 'flex',
                                                                        alignItems: 'center', justifyContent: 'center',
                                                                    }}
                                                                    title="Remove photo"
                                                                >✕</button>
                                                            </div>
                                                        ) : (
                                                            <label
                                                                htmlFor={`photo-${need.id}`}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                                                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                                                                    border: '1.5px dashed #d1d5db', color: '#6b7280',
                                                                    fontSize: '0.85rem', background: '#f9fafb',
                                                                    transition: 'border-color 0.15s',
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1a56db'}
                                                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                                                            >
                                                                📷 Upload or take photo
                                                            </label>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {/* Show saved completion note + photo if pending_review */}
                                            {need.status === 'pending_review' && need.completionNote && (
                                                <div style={{
                                                    marginTop: 12,
                                                    background: '#fef3c7',
                                                    border: '1px solid #fcd34d',
                                                    borderRadius: 8,
                                                    padding: '10px 12px',
                                                }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#92400e', marginBottom: 4 }}>
                                                        📝 Your submitted note:
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: '#78350f' }}>{need.completionNote}</p>
                                                    {need.completionPhoto && (
                                                        <img
                                                            src={need.completionPhoto}
                                                            alt="Your proof photo"
                                                            style={{ marginTop: 8, width: '100%', maxWidth: 240, borderRadius: 6, border: '1px solid #fcd34d' }}
                                                        />
                                                    )}
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

                                            {/* ✅ CHANGED: button disabled until note is typed */}
                                            {need.status === 'assigned' && (
                                                <button
                                                    onClick={() => handleVolunteerComplete(need)}
                                                    className="btn btn-success"
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                    disabled={
                                                        submittingIds.includes(need.id) ||
                                                        !(completionNotes[need.id]?.trim())
                                                    }
                                                    title={!(completionNotes[need.id]?.trim()) ? 'Please write a completion note first' : ''}
                                                >
                                                    {submittingIds.includes(need.id) ? (
                                                        <><span className="spinner"></span> Submitting...</>
                                                    ) : (
                                                        '📋 Submit for Review'
                                                    )}
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
                                        <div
                                            className="stat-card"
                                            onClick={() => toggleCommunityFilter('assigned')}
                                            style={{
                                                cursor: 'pointer',
                                                border: filters.includes('assigned') ? '2px solid #3b82f6' : '1px solid transparent'
                                            }}
                                        >
                                            <div className="stat-number" style={{ color: '#3b82f6' }}>{myInProgress}</div>
                                            <div className="stat-label">🔄 In Progress</div>
                                        </div>

                                        <div
                                            className="stat-card"
                                            onClick={() => toggleCommunityFilter('completed')}
                                            style={{
                                                cursor: 'pointer',
                                                border: filters.includes('completed') ? '2px solid #16a34a' : '1px solid transparent'
                                            }}
                                        >
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
                                        myNeeds.filter(n => {
                                            if (filters.length === 0) return true;
                                            if (filters.includes('assigned')) return n.status === 'assigned' || n.status === 'pending_review';
                                            if (filters.includes('completed')) return n.status === 'completed';
                                            return true;
                                        }).map((need) => (
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
                                                    <div style={{ display: 'flex', gap: 10, marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                                                        {need.status === 'open' && (
                                                            <Link to={`/edit-need/${need.id}`} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                                                ✏️ Edit
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteNeed(need.id)}
                                                            className="btn"
                                                            style={{ fontSize: '0.8rem', padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                                        >
                                                            🗑️ Delete
                                                        </button>
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
                                <div className="stat-number" style={{ color: '#f59e0b' }}>{stats.pendingReview}</div>
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

                        {/* Search bar */}
                        <div style={{ marginBottom: 16 }}>
                            <input
                                type="text"
                                placeholder="🔍 Search by title, description or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    fontSize: '0.95rem',
                                    border: '1.5px solid #d1d5db',
                                    borderRadius: '10px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>

                        {/* ✅ CHANGED: Multi-select filter buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: filters.length > 0 ? 8 : 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            {filterButtons.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => toggleFilter(key)}
                                    className="btn"
                                    style={{
                                        padding: '6px 16px',
                                        fontSize: '0.85rem',
                                        background: filters.includes(key) ? '#1a56db' : 'white',
                                        color: filters.includes(key) ? 'white' : '#374151',
                                        border: filters.includes(key) ? '1.5px solid #1a56db' : '1.5px solid #d1d5db',
                                        borderRadius: '20px',
                                        fontWeight: filters.includes(key) ? '600' : '400',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ✅ Clear filters button — only shows when something is selected */}
                        {filters.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <button
                                    onClick={clearFilters}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6b7280',
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: 0,
                                    }}
                                >
                                    ✕ Clear all filters ({filters.length} active)
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="loading-page"><p>Loading needs...</p></div>
                        ) : filteredNeeds.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
                                <h3>No results found</h3>
                                <p style={{ color: '#6b7280', marginTop: 8 }}>
                                    {searchQuery ? `No needs match "${searchQuery}"` : 'No community needs match this filter yet.'}
                                </p>
                                {(searchQuery || filters.length > 0) && (
                                    <button
                                        onClick={() => { setSearchQuery(''); clearFilters(); }}
                                        className="btn btn-outline"
                                        style={{ marginTop: 12 }}
                                    >
                                        Clear Search & Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p style={{ color: '#6b7280', marginBottom: 16, fontSize: '0.9rem' }}>
                                    Showing {filteredNeeds.length} need{filteredNeeds.length !== 1 ? 's' : ''}
                                    {searchQuery && ` matching "${searchQuery}"`}
                                    {filters.length > 0 && ` · Filters: ${filters.join(', ')}`}
                                    {' '}— sorted by AI priority score
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