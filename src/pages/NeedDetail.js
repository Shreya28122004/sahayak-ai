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
        setMatchLoading(true);
        setMatches([]);
        try {
            const result = await matchVolunteers(need, volunteers);
            const matchesWithData = result.matches.map((m) => ({
                ...m,
                volunteer: volunteers[m.volunteerIndex],
            }));
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
            setSuccess('Need marked as completed! Impact tracked.');
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
                    Back to Dashboard
                </button>

                {success && (
                    <div className="alert alert-success">{success}</div>
                )}

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
                                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {need.category}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {need.location}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {need.peopleAffected} people affected
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {need.status === 'completed' ? 'Completed' : need.status === 'assigned' ? 'Assigned' : 'Open'}
                                </span>
                            </div>
                            <p style={{ color: '#4b5563', lineHeight: 1.7 }}>{need.description}</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                            <div style={{ fontSize: '3rem', fontWeight: '800', color: getPriorityColor(need.aiUrgency) }}>
                                {need.aiScore}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>AI Score</div>
                        </div>
                    </div>

                    {need.aiExplanation && (
                        <div className="ai-box" style={{ marginTop: 16 }}>
                            <div className="ai-box-title">Gemini AI Explanation</div>
                            <p>{need.aiExplanation}</p>
                        </div>
                    )}

                    {need.assignedVolunteerName && (
                        <div className="alert alert-info" style={{ marginTop: 16 }}>
                            Assigned to: <strong>{need.assignedVolunteerName}</strong>
                        </div>
                    )}

                    {userProfile && userProfile.role === 'ngo' && need.status !== 'completed' && (
                        <div style={{ marginTop: 16 }}>
                            <button onClick={handleComplete} className="btn btn-success">
                                Mark as Completed
                            </button>
                        </div>
                    )}
                </div>

                {userProfile && userProfile.role === 'ngo' && need.status !== 'completed' && (
                    <div className="card">
                        <h3 style={{ marginBottom: 8 }}>Smart Volunteer Matching</h3>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: '0.9rem' }}>
                            Gemini AI will analyze {volunteers.length} registered volunteers and suggest the best matches.
                        </p>

                        <button
                            onClick={handleMatch}
                            className="btn btn-primary"
                            disabled={matchLoading || volunteers.length === 0}
                        >
                            {matchLoading ? 'Finding best matches...' : 'Find Best Volunteers with AI'}
                        </button>

                        {volunteers.length === 0 && (
                            <div className="alert alert-info" style={{ marginTop: 12 }}>
                                No volunteers registered yet.
                            </div>
                        )}

                        {matches.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <h4 style={{ marginBottom: 12 }}>Top Volunteer Matches:</h4>
                                {matches.map((match, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            border: '1.5px solid #e5e7eb',
                                            borderRadius: 10,
                                            padding: 16,
                                            marginBottom: 12,
                                            background: index === 0 ? '#f0fdf4' : 'white',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <strong>{match.volunteer ? match.volunteer.name : 'Unknown'}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                        {match.volunteer ? match.volunteer.location : ''}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                                    {match.volunteer && match.volunteer.skills && match.volunteer.skills.map((skill) => (
                                                        <span key={skill} className="badge badge-medium" style={{ fontSize: '0.75rem' }}>
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="ai-box">
                                                    <div className="ai-box-title">Why this volunteer?</div>
                                                    <p>{match.reason}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a56db' }}>
                                                    {match.matchScore}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Match Score</div>
                                                <button
                                                    onClick={() => handleAssign(
                                                        match.volunteer ? match.volunteer.id : '',
                                                        match.volunteer ? match.volunteer.name : ''
                                                    )}
                                                    className="btn btn-primary"
                                                    style={{ marginTop: 8, padding: '6px 14px', fontSize: '0.85rem' }}
                                                    disabled={assigning || need.status === 'assigned'}
                                                >
                                                    {need.assignedVolunteer === (match.volunteer ? match.volunteer.id : '') ? 'Assigned' : 'Assign'}
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