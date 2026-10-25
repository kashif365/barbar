import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardList, Menu, Radio, LogOut, Scissors, ScrollText, Settings, Tags, Users, X, LayoutDashboard, Globe } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Logo } from '../components/Logo';
import { cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { initialsOf } from '../utils/format';

interface Item { to: string; label: string; icon: ReactNode; end?: boolean }

const ICON = 'h-[1.15rem] w-[1.15rem] shrink-0';
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

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Owner', barber: 'Barber', staff: 'Reception' };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV[user.role] ?? NAV.owner ?? [];
  const initials = initialsOf(user.name);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col">
      <p className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.3em] text-muted/70">Menu</p>
      <div className="flex flex-col gap-1">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cx(
                'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all',
                isActive ? 'bg-gradient-to-r from-gold/15 to-transparent text-gold-strong' : 'text-muted hover:bg-white/[0.04] hover:text-cream',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="bg-gold-gradient absolute left-0 top-2 bottom-2 w-[3px] rounded-full" />}
                {i.icon}
                {i.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-white/[0.04] hover:text-cream">
          <Globe className={ICON} /> Public site
        </Link>
        <button onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-bad/10 hover:text-bad">
          <LogOut className={ICON} /> Sign out
        </button>
      </div>
    </nav>
  );

  const identity = (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/50 p-3">
      <span className="bg-gold-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-ink">{initials}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-cream">{user.name}</p>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">{ROLE_LABEL[user.role] ?? user.role}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-panel p-5 lg:flex">
        <Link to="/" className="flex items-center gap-3 px-1">
          <Logo size={44} className="ring-1 ring-gold/40" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold text-cream">Shehraz</span>
            <span className="block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-gold">Barber · Desk</span>
          </span>
        </Link>
        {identity}
        {nav}
      </aside>

      <div className="min-w-0">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ink/85 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size={36} className="ring-1 ring-gold/40" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-cream">{user.name}</span>
              <span className="block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-gold">{ROLE_LABEL[user.role] ?? user.role}</span>
            </span>
          </div>
          <button className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
            <div className="rise absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-5 border-l border-line bg-panel p-5">
              <button className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-6 w-6" />
              </button>
              {identity}
              {nav}
            </div>
          </div>
        )}

        <main className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(50%_100%_at_30%_0%,rgb(201_164_92/0.09),transparent_100%)]" />
          <div className="relative">
            <ErrorBoundary resetKey={pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
