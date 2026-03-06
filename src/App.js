import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/Login';
import Dashboard from './components/Dashboard';
import DoctorSettings from './components/DoctorSetting';
import ServicesManagement from './components/ServicesManagement';
import RevenueAnalytics from './components/RevenueAnalytics';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PatientProvider } from './components/PatientContext';
import { DoctorProvider } from './components/DoctorContext';
import { OwnerProvider, useOwnerContext } from './components/OwnerContext';
import { NextVisitProvider } from './components/NextVisitContext';
import { ClinicProvider } from './components/ClinicContext';
import { InventoryProvider } from './components/InventoryContext';
import InventoryManagement from './components/InventoryManagement';
import ExternalServiceManagement from './components/ExternalServiceManagement';
import HistoryTemplateBuilder from './components/HistoryTemplateBuilder';
import VisitTypeSettings from './components/VisitTypeSettings';
import ReferralSourcesPage from './components/ReferralSourcesPage';
import PackagesManagement from './components/PackagesManagement';
import { LanguageProvider } from './components/LanguageContext';

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

// Protects analytics route: only owners (or legacy doctors) can see revenue & analytics
const AnalyticsRoute = ({ children }) => {
  const { canSeeRevenueAnalytics, loading } = useOwnerContext();
  if (loading) return null; // or a small spinner
  if (!canSeeRevenueAnalytics) return <Navigate to="/dashboard" replace />;
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
      <LanguageProvider>
        <AuthProvider>
          <DoctorProvider>
            <OwnerProvider>
            <ClinicProvider>
              <InventoryProvider>
                <NextVisitProvider>
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
                    <Route
                      path="/services"
                      element={
                        <ProtectedRoute>
                          <ServicesManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <AnalyticsRoute>
                            <RevenueAnalytics />
                          </AnalyticsRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/inventory"
                      element={
                        <ProtectedRoute>
                          <InventoryManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/external-services"
                      element={
                        <ProtectedRoute>
                          <ExternalServiceManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/history-template"
                      element={
                        <ProtectedRoute>
                          <HistoryTemplateBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/referral-sources"
                      element={
                        <ProtectedRoute>
                          <ReferralSourcesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/packages"
                      element={
                        <ProtectedRoute>
                          <PackagesManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                  </Routes>
                </NextVisitProvider>
              </InventoryProvider>
            </ClinicProvider>
            </OwnerProvider>
          </DoctorProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;