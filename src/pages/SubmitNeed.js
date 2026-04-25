import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { scorePriority } from '../services/gemini';
import Navbar from '../components/Navbar';

export default function SubmitNeed() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams(); // if id exists, we are in edit mode
    const isEditMode = !!id;

    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        category: '',
        peopleAffected: '',
    });

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fetchingNeed, setFetchingNeed] = useState(isEditMode);

    // If edit mode, load existing need data into form
    useEffect(() => {
        if (!isEditMode) return;

        async function loadNeed() {
            try {
                const docRef = doc(db, 'needs', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setForm({
                        title: data.title || '',
                        description: data.description || '',
                        location: data.location || '',
                        category: data.category || '',
                        peopleAffected: data.peopleAffected?.toString() || '',
                    });
                } else {
                    setError('Need not found.');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load need. Please try again.');
            }
            setFetchingNeed(false);
        }

        loadNeed();
    }, [id, isEditMode]);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.title || !form.description || !form.location || !form.category || !form.peopleAffected) {
            return setError('Please fill in all fields.');
        }

        setLoading(true);
        setAiLoading(true);

        try {
            // Step 1: Get Gemini AI priority score
            setSuccess('🤖 Gemini AI is analyzing your need...');
            const aiResult = await scorePriority(form);
            setAiLoading(false);

            if (isEditMode) {
                // EDIT MODE — update existing document
                setSuccess('💾 Updating your need...');
                const docRef = doc(db, 'needs', id);
                await updateDoc(docRef, {
                    ...form,
                    peopleAffected: parseInt(form.peopleAffected),
                    aiScore: aiResult.score,
                    aiUrgency: aiResult.urgency,
                    aiExplanation: aiResult.explanation,
                    updatedAt: new Date().toISOString(),
                });
                setSuccess('✅ Need updated! New AI Score: ' + aiResult.score + '/10 — ' + aiResult.urgency);
            } else {
                // CREATE MODE — add new document
                setSuccess('💾 Saving to database...');
                await addDoc(collection(db, 'needs'), {
                    ...form,
                    peopleAffected: parseInt(form.peopleAffected),
                    submittedBy: currentUser.uid,
                    submittedByName: userProfile?.name || 'Anonymous',
                    aiScore: aiResult.score,
                    aiUrgency: aiResult.urgency,
                    aiExplanation: aiResult.explanation,
                    status: 'open',
                    assignedVolunteer: null,
                    createdAt: new Date().toISOString(),
                });
                setSuccess('✅ Need submitted successfully! AI Score: ' + aiResult.score + '/10 — ' + aiResult.urgency);
                setForm({
                    title: '',
                    description: '',
                    location: '',
                    category: '',
                    peopleAffected: '',
                });
            }

            // Redirect to dashboard after 3 seconds
            setTimeout(() => navigate('/dashboard'), 3000);

        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        }

        setLoading(false);
    }

    // Show loading while fetching need data in edit mode
    if (fetchingNeed) {
        return (
            <div className="page">
                <Navbar />
                <div className="container" style={{ maxWidth: 700, textAlign: 'center', paddingTop: 60 }}>
                    <div className="spinner"></div>
                    <p>Loading need details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <Navbar />
            <div className="container" style={{ maxWidth: 700 }}>
                <div className="page-title">
                    {isEditMode ? '✏️ Edit Community Need' : '📋 Submit a Community Need'}
                </div>
                <p className="page-subtitle">
                    {isEditMode
                        ? 'Update the details below. Gemini AI will re-score the urgency automatically.'
                        : 'Describe the need in your community. Gemini AI will analyze and score its urgency automatically.'}
                </p>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                {aiLoading && (
                    <div className="ai-box" style={{ marginBottom: 20 }}>
                        <div className="ai-box-title">🤖 Gemini AI Analysis in Progress...</div>
                        <p>Please wait while AI analyzes the urgency of this need.</p>
                    </div>
                )}

                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Need Title *</label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="e.g. Flood victims need food and shelter in Koramangala"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Category *</label>
                            <select name="category" value={form.category} onChange={handleChange} required>
                                <option value="">Select a category</option>
                                <option value="Food & Water">🍱 Food & Water</option>
                                <option value="Medical Aid">🏥 Medical Aid</option>
                                <option value="Shelter">🏠 Shelter</option>
                                <option value="Education">📚 Education</option>
                                <option value="Clothing">👕 Clothing</option>
                                <option value="Mental Health">🧠 Mental Health</option>
                                <option value="Disaster Relief">🆘 Disaster Relief</option>
                                <option value="Elderly Care">👴 Elderly Care</option>
                                <option value="Child Welfare">👶 Child Welfare</option>
                                <option value="Other">📌 Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Location *</label>
                            <input
                                name="location"
                                value={form.location}
                                onChange={handleChange}
                                placeholder="e.g. Koramangala, Bengaluru, Karnataka"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Number of People Affected *</label>
                            <input
                                name="peopleAffected"
                                type="number"
                                value={form.peopleAffected}
                                onChange={handleChange}
                                placeholder="e.g. 50"
                                min="1"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Detailed Description *</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Describe the situation in detail. Include what kind of help is needed, how urgent it is, and any other relevant information..."
                                rows={5}
                                required
                            />
                        </div>

                        <div className="ai-box" style={{ marginBottom: 20 }}>
                            <div className="ai-box-title">🤖 Gemini AI Will Automatically:</div>
                            <p>✅ Analyze your description and assign a priority score (1-10)</p>
                            <p>✅ Classify urgency as Critical / High / Medium / Low</p>
                            <p>✅ Generate an explanation for why this need has that priority</p>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
                                onClick={() => navigate('/dashboard')}
                                disabled={loading}
                            >
                                ← Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 2, justifyContent: 'center', padding: '14px' }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner"></span> AI is analyzing & saving...</>
                                ) : isEditMode ? (
                                    '💾 Save Changes — Re-score with AI'
                                ) : (
                                    '🚀 Submit Need — Let AI Score It'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}