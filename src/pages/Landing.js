import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const stats = [
    { number: '500+', label: 'Volunteers Coordinated' },
    { number: '1,200+', label: 'Needs Resolved' },
    { number: '8,000+', label: 'People Helped' },
    { number: '50+', label: 'NGOs Onboarded' },
];

const steps = [
    {
        icon: '📋',
        step: '01',
        title: 'Community Reports a Need',
        desc: 'A community member submits a need — food shortage, medical emergency, flood relief. Takes 60 seconds.',
    },
    {
        icon: '🤖',
        step: '02',
        title: 'Gemini AI Scores & Matches',
        desc: 'Google Gemini AI instantly scores urgency 1–10 and matches the most suitable volunteers by skill and location.',
    },
    {
        icon: '✅',
        step: '03',
        title: 'NGO Coordinates & Tracks Impact',
        desc: 'NGO assigns the volunteer, tracks task completion, approves results, and sees real-time impact stats.',
    },
];

const features = [
    { icon: '🔴', title: 'AI Priority Scoring', desc: 'Gemini AI scores every need 1–10 so critical cases are never missed.' },
    { icon: '🎯', title: 'Smart Volunteer Matching', desc: 'AI matches volunteers by skills, location, and availability — no manual guesswork.' },
    { icon: '📊', title: 'Real-Time Impact Tracking', desc: 'Live dashboards show tasks completed, people helped, and needs pending.' },
    { icon: '🔍', title: 'Explainable AI', desc: 'Every AI decision comes with a plain-language explanation — full transparency.' },
    { icon: '🔔', title: 'Instant Notifications', desc: 'Volunteers are notified the moment they are assigned a task.' },
    { icon: '🌍', title: 'Built for Scale', desc: 'Designed for NGOs managing hundreds of volunteers across multiple districts.' },
];

const roles = [
    { icon: '👥', role: 'Community Member', desc: 'Report needs in your area in under a minute', color: '#10b981' },
    { icon: '🏢', role: 'NGO Coordinator', desc: 'Manage volunteers, assignments & impact', color: '#f59e0b' },
    { icon: '🙋', role: 'Volunteer', desc: 'Register your skills and take on meaningful tasks', color: '#6366f1' },
];

export default function Landing() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
    }, []);

    return (
        <div className="landing-page">
            <Navbar />

            {/* ── HERO ── */}
            <section className="landing-hero">
                <div className={`hero-content ${visible ? 'hero-visible' : ''}`}>

                    <h1 className="hero-title">
                        Intelligent Volunteer<br />
                        <span className="hero-accent">Coordination</span> for<br />
                        Social Impact
                    </h1>
                    <p className="hero-subtitle">
                        Sahayak AI uses Google Gemini to score urgent community needs, match the right
                        volunteers, and help NGOs coordinate relief — faster than ever before.
                    </p>
                    <div className="hero-cta-row">
                        <Link to="/register" className="hero-btn-primary">
                            Get Started Free →
                        </Link>
                        <Link to="/login" className="hero-btn-outline">
                            Sign In
                        </Link>
                    </div>
                    <p className="hero-note">Free to use · No credit card · 3 roles supported</p>
                </div>


            </section>

            {/* ── STATS BAR ── */}
            <section className="stats-bar">
                {stats.map((s) => (
                    <div className="stats-bar-item" key={s.label}>
                        <div className="stats-bar-number">{s.number}</div>
                        <div className="stats-bar-label">{s.label}</div>
                    </div>
                ))}
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="how-section">
                <div className="section-tag">How It Works</div>
                <h2 className="section-title">From Crisis to Coordination<br />in Three Steps</h2>
                <p className="section-sub">Sahayak AI removes the chaos from disaster response</p>
                <div className="steps-row">
                    {steps.map((s, i) => (
                        <div className="step-card" key={s.step}>
                            <div className="step-number">{s.step}</div>
                            <div className="step-icon">{s.icon}</div>
                            <h3 className="step-title">{s.title}</h3>
                            <p className="step-desc">{s.desc}</p>
                            {i < steps.length - 1 && <div className="step-arrow">→</div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className="feat-section">
                <div className="section-tag">Features</div>
                <h2 className="section-title">Everything an NGO Needs</h2>
                <p className="section-sub">Powered by Google Gemini AI — built for real-world impact</p>
                <div className="feat-grid">
                    {features.map((f) => (
                        <div className="feat-card" key={f.title}>
                            <div className="feat-icon">{f.icon}</div>
                            <h3 className="feat-title">{f.title}</h3>
                            <p className="feat-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── THREE ROLES ── */}
            <section className="roles-section">
                <div className="section-tag light">Who Is It For?</div>
                <h2 className="section-title light">Three Roles, One Mission</h2>
                <p className="section-sub light">Everyone plays a part in building a stronger community</p>
                <div className="roles-row">
                    {roles.map((r) => (
                        <div className="role-card" key={r.role} style={{ '--role-color': r.color }}>
                            <div className="role-icon">{r.icon}</div>
                            <h3 className="role-name">{r.role}</h3>
                            <p className="role-desc">{r.desc}</p>
                        </div>
                    ))}
                </div>
                <Link to="/register" className="roles-cta">Join Sahayak AI Today →</Link>
            </section>

            {/* ── FOOTER CTA ── */}
            <section className="footer-cta">
                <h2>Ready to Make an Impact?</h2>
                <p>Join NGOs, volunteers, and communities already using Sahayak AI</p>
                <div className="hero-cta-row" style={{ justifyContent: 'center', marginTop: 28 }}>
                    <Link to="/register" className="hero-btn-primary">Create Free Account →</Link>
                    <Link to="/login" className="hero-btn-outline">Sign In</Link>
                </div>
            </section>

            <footer className="landing-footer">
                <span>© 2026 Sahayak AI · Built for Google Solution Challenge · Powered by Google Gemini</span>
            </footer>
        </div>
    );
}