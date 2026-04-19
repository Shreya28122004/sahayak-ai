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
            setSuccess('✅ Profile saved successfully! NGOs can now find and match you to needs.');
        } catch (err) {
            setError('Failed to save profile. Please try again.');
        }
        setLoading(false);
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
                <div className="page-title">🙋 Volunteer Profile</div>
                <p className="page-subtitle">
                    Set up your profile so NGO coordinators can match you to community needs.
                </p>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="card"></div>