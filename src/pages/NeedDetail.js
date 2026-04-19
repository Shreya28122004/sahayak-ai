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
                // Fetch need
                const needDoc = await getDoc(doc(db, 'needs', id));
                if (needDoc.exists()) {
                    setNeed({ id: needDoc.id, ...needDoc.data() });
                }
                // Fetch volunteers
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
        setMatchLoadi