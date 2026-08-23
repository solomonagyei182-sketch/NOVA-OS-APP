import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { SetupPage } from '../features/auth/SetupPage';
import { useAuth } from '../features/auth/AuthContext';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { SalesPage } from '../features/sales/SalesPage';
import { CalculationsPage } from '../features/calculations/CalculationsPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { Layout } from './Layout';

const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AdminLayout = lazy(() => import('../features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = lazy(() =>
  import('../features/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminProductsPage = lazy(() =>
  import('../features/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminResellersPage = lazy(() =>
  import('../features/admin/AdminResellersPage').then((m) => ({ default: m.AdminResellersPage })),
);
const ResellerDetailPage = lazy(() =>
  import('../features/admin/ResellerDetailPage').then((m) => ({ default: m.ResellerDetailPage })),
);
const AdminStaffPage = lazy(() =>
  import('../features/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })),
);
const AdminSessionsPage = lazy(() =>
  import('../features/admin/AdminSessionsPage').then((m) => ({ default: m.AdminSessionsPage })),
);
const AdminActivityLogPage = lazy(() =>
  import('../features/admin/AdminActivityLogPage').then((m) => ({ default: m.AdminActivityLogPage })),
);
const AdminSettingsPage = lazy(() =>
  import('../features/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);

function RouteLoadingFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}

export function AppRouter() {
  const { isLoading, needsSetup, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // A freshly deployed workspace (no accounts yet) always lands on /setup;
  // once it's initialized, /setup is no longer reachable — unless setup just
  // finished and signed someone in, in which case SetupPage's own navigate()
  // is already taking them to /dashboard and this guard should stay out of the way.
  if (needsSetup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  if (!needsSetup && !user && location.pathname === '/setup') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/calculations" element={<CalculationsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />

          <Route element={<RoleRoute allow={['MANAGER']} />}>
            <Route path="/customers" element={<CustomersPage />} />
            <Route
              path="/reports"
              element={
                <LazyRoute>
                  <ReportsPage />
                </LazyRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <LazyRoute>
                  <AdminLayout />
                </LazyRoute>
              }
            >
              <Route
                index
                element={
                  <LazyRoute>
                    <AdminOverviewPage />
                  </LazyRoute>
                }
              />
              <Route
                path="products"
                element={
                  <LazyRoute>
                    <AdminProductsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="resellers"
                element={
                  <LazyRoute>
                    <AdminResellersPage />
                  </LazyRoute>
                }
              />
              <Route
                path="resellers/:id"
                element={
                  <LazyRoute>
                    <ResellerDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path="staff"
                element={
                  <LazyRoute>
                    <AdminStaffPage />
                  </LazyRoute>
                }
              />
              <Route
                path="sessions"
                element={
                  <LazyRoute>
                    <AdminSessionsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="activity"
                element={
                  <LazyRoute>
                    <AdminActivityLogPage />
                  </LazyRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <LazyRoute>
                    <AdminSettingsPage />
                  </LazyRoute>
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
