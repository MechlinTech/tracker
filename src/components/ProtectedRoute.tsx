import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../lib/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'hr' | 'accountant' | 'employee')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const user = useStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Not authorized, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 