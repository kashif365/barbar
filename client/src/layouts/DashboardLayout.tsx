import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, Menu, Radio, LogOut, Scissors, ScrollText, Settings, Tags, Users, X, LayoutDashboard, Globe } from 'lucide-react';
import { Logo } from '../components/Logo';
import { cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';

interface Item { to: string; label: string; icon: ReactNode; end?: boolean }

const ICON = 'h-5 w-5 shrink-0';
const OWNER_ITEMS: Item[] = [
  { to: '/owner', label: 'Overview', icon: <LayoutDashboard className={ICON} />, end: true },
  { to: '/owner/queue', label: 'Live queue', icon: <Radio className={ICON} /> },
  { to: '/owner/tokens', label: 'All tokens', icon: <ClipboardList className={ICON} /> },
  { to: '/owner/services', label: 'Services', icon: <Tags className={ICON} /> },
  { to: '/owner/team', label: 'Barbers & staff', icon: <Users className={ICON} /> },
  { to: '/owner/reports', label: 'Reports', icon: <BarChart3 className={ICON} /> },
  { to: '/owner/audit', label: 'Audit log', icon: <ScrollText className={ICON} /> },
  { to: '/owner/settings', label: 'Settings', icon: <Settings className={ICON} /> },
];

const NAV: Record<string, Item[]> = {
  owner: OWNER_ITEMS,
  admin: OWNER_ITEMS,
  barber: [{ to: '/barber', label: 'My queue', icon: <Scissors className={ICON} />, end: true }],
  staff: [{ to: '/reception', label: 'Queue desk', icon: <Radio className={ICON} />, end: true }],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV[user.role] ?? NAV.owner ?? [];

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors', isActive ? 'bg-gold/10 text-gold-strong' : 'text-muted hover:bg-white/5 hover:text-white')
          }
        >
          {i.icon}
          {i.label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 pt-6">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-white/5 hover:text-white">
          <Globe className={ICON} /> Public site
        </Link>
        <button onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-white/5 hover:text-white">
          <LogOut className={ICON} /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-ink lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-panel p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3 px-1">
          <Logo size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="text-xs capitalize text-muted">{user.role === 'staff' ? 'Reception' : user.role}</p>
          </div>
        </div>
        {nav}
      </aside>

      <div className="min-w-0">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink/95 px-4 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size={32} />
            <span className="truncate text-sm font-semibold">{user.name}</span>
          </div>
          <button className="-mr-2 inline-flex h-11 w-11 items-center justify-center" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-panel p-4">
              <button className="mb-4 ml-auto inline-flex h-11 w-11 items-center justify-center" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-6 w-6" />
              </button>
              {nav}
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
