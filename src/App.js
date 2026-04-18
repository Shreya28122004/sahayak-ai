import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitNeed from './pages/SubmitNeed';
import VolunteerProfile from './pages/VolunteerProfile';
import NeedDetail from './pages/NeedDetail';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/submit-need"
            element={<PrivateRoute><SubmitNeed /></PrivateRoute>}
          />
          <Route
            path="/volunteer-profile"
            element={<PrivateRoute><VolunteerProfile /></PrivateRoute>}
          />
          <Route
            path="/need/:id"
            element={<PrivateRoute><NeedDetail /></PrivateRoute>}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;