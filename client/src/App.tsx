import { Link, Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import BarberDesk from './pages/barber/BarberDesk';
import Book from './pages/Book';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import OwnerAudit from './pages/owner/OwnerAudit';
import OwnerOverview from './pages/owner/OwnerOverview';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerServices from './pages/owner/OwnerServices';
import OwnerSettings from './pages/owner/OwnerSettings';
import OwnerTeam from './pages/owner/OwnerTeam';
import OwnerTokens from './pages/owner/OwnerTokens';
import QueuePage from './pages/QueuePage';
import Services from './pages/Services';
import QueueDesk from './pages/staff/QueueDesk';
import TokenPage from './pages/TokenPage';
import ProtectedRoute from './routes/ProtectedRoute';

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-gold px-5 font-semibold text-ink">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/book" element={<Book />} />
        <Route path="/token/:trackingToken" element={<TokenPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Route guards are a UX nicety; every API call is authorized again on the server. */}
      <Route element={<ProtectedRoute roles={['owner']} />}>
        <Route path="/owner" element={<DashboardLayout />}>
          <Route index element={<OwnerOverview />} />
          <Route path="queue" element={<QueueDesk />} />
          <Route path="tokens" element={<OwnerTokens />} />
          <Route path="services" element={<OwnerServices />} />
          <Route path="team" element={<OwnerTeam />} />
          <Route path="reports" element={<OwnerReports />} />
          <Route path="audit" element={<OwnerAudit />} />
          <Route path="settings" element={<OwnerSettings />} />
          <Route path="*" element={<Navigate to="/owner" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['barber']} />}>
        <Route path="/barber" element={<DashboardLayout />}>
          <Route index element={<BarberDesk />} />
          <Route path="*" element={<Navigate to="/barber" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['staff']} />}>
        <Route path="/reception" element={<DashboardLayout />}>
          <Route index element={<QueueDesk />} />
          <Route path="*" element={<Navigate to="/reception" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
