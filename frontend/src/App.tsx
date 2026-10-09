import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';

import { Login } from './pages/Login';
import { CommandCenter } from './pages/CommandCenter';
import { ScoutIngestion } from './pages/ScoutIngestion';
import { AnalysisDetail } from './pages/AnalysisDetail';
import { MissionArchives } from './pages/MissionArchives';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <ToastProvider>
            <Routes>
              {/* Public Security Clearance Route */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated Protected Routes wrapped in Tactical AppShell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CommandCenter />} />
                <Route path="ingest" element={<ScoutIngestion />} />
                <Route path="analyses/:id" element={<AnalysisDetail />} />
                <Route path="archives" element={<MissionArchives />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
