// No change needed — sendPasswordResetEmail is imported directly 
// in Login.js from firebase/auth, so AuthContext doesn't need updating!
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function register(email, password, name, role) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        const profileData = {
            name,
            email,
            role,
            createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', result.user.uid), profileData);
        setUserProfile(profileData);
        return result;
    }

    async function login(email, password) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await fetchUserProfile(result.user.uid);
        return result;
    }

    async function logout() {
        setUserProfile(null);
        return signOut(auth);
    }

    async function fetchUserProfile(uid) {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                await fetchUserProfile(user.uid);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        register,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}