import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const SKILLS_LIST = [
    'Medical Aid', 'First Aid', 'Teaching', 'Counseling',
    'Cooking', 'Driving', 'Construction', 'IT Support',
    'Social Work', 'Fundraising', 'Translation', 'Legal Aid',
    'Mental Health', 'Child Care', 'Elderly Care', 'Disaster Relief',
];

export default function VolunteerProfile() {
    const { currentUser, userProfile } = useAuth();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        location: '',
        availability: 'weekends',
        skills: [],
        bio: '',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchProfile() {
            try {
                const docRef = doc(db, 'volunteers', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setForm(docSnap.data());
                } else {
                    setForm((f) => ({ ...f, name: userProfile?.name || '' }));
                }
            } catch (err) {
                console.error(err);
            }
            setFetching(false);
        }
        fetchProfile();
    }, [currentUser, userProfile]);

    function toggleSkill(skill) {
        setForm((f) => ({
            ...f,
            skills: f.skills.includes(skill)
                ? f.skills.filter((s) => s !== skill)
                : [...f.skills, skill],
        }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.name || !form.location || form.skills.length === 0) {
            return setError('Please fill in name, location and select at least one skill.');
        }

        setLoading(true);

        try {
            await setDoc(doc(db, 'volunteers', currentUser.uid), {
                ...form,
                uid: currentUser.uid,
                email: currentUser.email,
                role: 'volunteer',
                updatedAt: new Date().toISOString(),
            });
            setSuccess('✅ Profile saved! NGOs can now find and match you to needs.');
        } catch (err) {
            console.error(err);
            setError('❌ Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <div className="page">
                <Navbar />
                <div className="loading-page">
                    <p>Loading your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <Navbar />
            <div className="container" style={{ maxWidth: 700 }}>
                <div className="page-title">Volunteer Profile</div>
                <p className="page-subtitle">
                    Set up your profile so NGO coordinators can match you to community needs.
                </p>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="card">
                    <form onSubmit={handleSave}>

                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Your full name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="e.g. +91 98765 43210"
                            />
                        </div>

                        <div className="form-group">
                            <label>Your Location</label>
                            <input
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                placeholder="e.g. Koramangala, Bengaluru"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Availability</label>
                            <select
                                value={form.availability}
                                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                            >
                                <option value="weekends">Weekends Only</option>
                                <option value="weekdays">Weekdays Only</option>
                                <option value="full-time">Full Time</option>
                                <option value="on-call">On Call Emergency</option>
                                <option value="flexible">Flexible</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Your Skills (select all that apply)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {SKILLS_LIST.map((skill) => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            border: '1.5px solid',
                                            borderColor: form.skills.includes(skill) ? '#1a56db' : '#d1d5db',
                                            background: form.skills.includes(skill) ? '#eff6ff' : 'white',
                                            color: form.skills.includes(skill) ? '#1a56db' : '#374151',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            fontWeight: form.skills.includes(skill) ? '600' : '400',
                                        }}
                                    >
                                        {/* ✅ FIX: Use ✓ checkmark instead of the word "check" */}
                                        {form.skills.includes(skill) ? '✓ ' : ''}{skill}
                                    </button>
                                ))}
                            </div>
                            {/* ✅ FIX: Correct plural/singular skills count */}
                            {form.skills.length > 0 && (
                                <p style={{ marginTop: 8, fontSize: '0.85rem', color: '#1a56db' }}>
                                    {form.skills.length} skill{form.skills.length !== 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Bio (optional)</label>
                            <textarea
                                value={form.bio}
                                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                placeholder="Tell NGOs about yourself and your experience..."
                                rows={3}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-success"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '14px',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <><span className="spinner"></span> Saving Profile...</>
                            ) : success ? (
                                '✅ Profile Saved!'
                            ) : (
                                '💾 Save Volunteer Profile'
                            )}
                        </button>

                    </form>
                </div>

                {form.skills.length > 0 && (
                    <div className="card" style={{ marginTop: 16 }}>
                        <h3 style={{ marginBottom: 12 }}>👤 Profile Preview</h3>
                        <p><strong>{form.name}</strong></p>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            📍 Location: {form.location}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                            🕐 Availability: {form.availability}
                        </p>
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {form.skills.map((skill) => (
                                <span key={skill} className="badge badge-medium">{skill}</span>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}