import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Navbar() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // ✅ Listen for unread notifications — works for BOTH volunteer and NGO roles
    useEffect(() => {
        if (!currentUser) return;
        // Only run for roles that have a bell (volunteer + ngo)
        if (userProfile?.role !== 'volunteer' && userProfile?.role !== 'ngo') return;

        const q = query(
            collection(db, 'notifications'),
            where('toUserId', '==', currentUser.uid),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setNotifications(data);
        });

        return unsubscribe;
    }, [currentUser, userProfile]);

    // ✅ Mark a single notification as read
    async function markAsRead(notifId) {
        try {
            await updateDoc(doc(db, 'notifications', notifId), { read: true });
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }

    // ✅ Mark all as read
    async function markAllRead() {
        try {
            await Promise.all(notifications.map((n) => markAsRead(n.id)));
        } catch (err) {
            console.error(err);
        }
    }

    // ✅ Where clicking a notification goes
    // Volunteer → dashboard; NGO → directly to the need detail page
    function handleNotifClick(notif) {
        markAsRead(notif.id);
        setShowDropdown(false);
        if (userProfile?.role === 'ngo' && notif.needId) {
            navigate(`/need/${notif.needId}`);
        } else {
            navigate('/dashboard');
        }
    }

    async function handleLogout() {
        await logout();
        navigate('/');
    }

    // ✅ Show bell for both volunteer and NGO
    const showBell = userProfile?.role === 'volunteer' || userProfile?.role === 'ngo';

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                🤝 Sahayak AI
            </Link>
            <div className="navbar-links">
                {currentUser ? (
                    <>
                        <Link to="/dashboard" className="nav-btn">Dashboard</Link>
                        {userProfile?.role === 'community' && (
                            <Link to="/submit-need" className="nav-btn">Submit Need</Link>
                        )}
                        {userProfile?.role === 'volunteer' && (
                            <Link to="/volunteer-profile" className="nav-btn">My Profile</Link>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                            {userProfile?.name} ({userProfile?.role})
                        </span>

                        {/* ✅ NOTIFICATION BELL — now for both volunteer and NGO */}
                        {showBell && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowDropdown((prev) => !prev)}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '1.1rem',
                                        position: 'relative',
                                        color: 'white',
                                    }}
                                >
                                    🔔
                                    {notifications.length > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            background: '#ef4444',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>

                                {/* DROPDOWN */}
                                {showDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '44px',
                                        right: 0,
                                        background: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                                        minWidth: '300px',
                                        zIndex: 200,
                                        overflow: 'hidden',
                                    }}>
                                        {/* Header */}
                                        <div style={{
                                            padding: '14px 16px',
                                            borderBottom: '1px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <span style={{ fontWeight: '700', color: '#1a202c', fontSize: '0.95rem' }}>
                                                🔔 Notifications
                                            </span>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={markAllRead}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#1a56db',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        {/* Notification list */}
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                                                ✅ You're all caught up!
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => handleNotifClick(notif)}
                                                    style={{
                                                        padding: '14px 16px',
                                                        borderBottom: '1px solid #f3f4f6',
                                                        cursor: 'pointer',
                                                        background: '#eff6ff',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                                                >
                                                    <div style={{ fontSize: '0.88rem', color: '#1a202c', fontWeight: '600', marginBottom: 4 }}>
                                                        {notif.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                                                        {notif.message}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={handleLogout} className="nav-btn danger">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="nav-btn">Login</Link>
                        <Link to="/register" className="nav-btn primary">Get Started</Link>
                    </>
                )}
            </div>
        </nav>
    );
}