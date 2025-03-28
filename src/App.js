import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.tsx';
import Home from './components/Home.tsx';
import Dashboard from './components/Dashboard';
import { AuthProvider } from './components/AuthContext';

function App() {
    return (
        <Router>
         <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
