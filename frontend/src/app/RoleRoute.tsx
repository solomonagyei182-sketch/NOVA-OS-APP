import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { Role } from '../lib/types';

export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
