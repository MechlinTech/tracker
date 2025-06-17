import { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
// import { startScheduledJob, stopScheduledJob } from './services/scheduler';

// Lazy load components
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const TimeTracker = lazy(() => import('./components/TimeTracker'));
const TeamView = lazy(() => import('./components/TeamView'));
const Screenshots = lazy(() => import('./components/Screenshots'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const HRManagement = lazy(() => import('./components/HRManagement'));
const LeaveManagement = lazy(() => import('./components/LeaveManagement'));
const Reports = lazy(() => import('./components/Reports'));
const PasswordChangeModal = lazy(() => import('./components/PasswordChangeModal'));
const Profile = lazy(() => import('./components/Profile'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useStore((state) => state.setUser);
  const isInitialized = useStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const cachedProfile = useStore.getState().getCacheItem(`profile-${session.user.id}`);
          
          if (cachedProfile) {
            setUser(cachedProfile);
            setIsLoading(false);
            return;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            setUser(profile);
            useStore.getState().setCacheItem(`profile-${session.user.id}`, profile);
          } else {
            setUser(null);
            sessionStorage.setItem('redirectTo', location.pathname);
          }
        } else {
          setUser(null);
          sessionStorage.setItem('redirectTo', location.pathname);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        sessionStorage.setItem('redirectTo', location.pathname);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [location, setUser, isInitialized]);

  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  return user ? <>{children}</> : <Navigate to="/login" state={{ from: location }} />;
}

export default function App() {
  // useEffect(() => {
  //   // Start the scheduled job
  //   startScheduledJob();

  //   // Cleanup function to stop the job when component unmounts
  //   return () => {
  //     stopScheduledJob();
  //   };
  // }, []);

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Navigate to="/dashboard" replace />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/time-tracker" element={
            <PrivateRoute>
              <Layout>
                <TimeTracker />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/team" element={
            <PrivateRoute>
              <Layout>
                <TeamView />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/screenshots" element={
            <PrivateRoute>
              <Layout>
                <Screenshots />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <Layout>
                <AdminPanel />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/hr" element={
            <PrivateRoute>
              <Layout>
                <HRManagement />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/leave" element={
            <PrivateRoute>
              <Layout>
                <LeaveManagement />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/reports" element={
            <PrivateRoute>
              <Layout>
                <Reports />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/privacy" element={
            <Layout>
              <PrivacyPolicy />
            </Layout>
          } />
          <Route path="/terms" element={
            <Layout>
              <Terms />
            </Layout>
          } />
          <Route path="/contact" element={
            <Layout>
              <Contact />
            </Layout>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}