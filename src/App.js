import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/Login';
import Dashboard from './components/Dashboard';
import DoctorSettings from './components/DoctorSetting';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PatientProvider } from './components/PatientContext';
import { DoctorProvider } from './components/DoctorContext'; // Path fixed

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  
  if (!isLoggedIn()) {
    // Redirect to login with the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Public route - redirects to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Wrap everything in DoctorProvider */}
        <DoctorProvider>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  {/* Wrap Dashboard with PatientProvider */}
                  <PatientProvider>
                    <Dashboard />
                  </PatientProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <PatientProvider>
                    <DoctorSettings />
                  </PatientProvider>
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </DoctorProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;