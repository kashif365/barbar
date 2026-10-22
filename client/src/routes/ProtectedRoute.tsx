import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui';
import type { Role } from '../types';

/**
 * UX guard only. The real enforcement is on the server for every API call;
 * hiding a page here never replaces server-side authorization.
 */
export default function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-dvh bg-ink"><Spinner label="Checking your session" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  const hasAccess = roles.includes(user.role) || ((user.role as string) === 'admin' && roles.includes('owner'));
  if (!hasAccess) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
