import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectView from './pages/ProjectView';
import Settings from './pages/Settings';
import CommandPalette from './components/CommandPalette';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading...</p></div>;
    return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
    return user ? <Navigate to="/dashboard" /> : children;
}

function AppContent() {
    const { user } = useAuth();
    return (
        <>
            <Routes>
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
            {user && <CommandPalette />}
        </>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
