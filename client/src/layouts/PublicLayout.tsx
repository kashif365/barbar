import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Instagram, Menu, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useFetch } from '../hooks/useFetch';
import { endpoints } from '../services/api';
import { cx } from '../components/ui';
import { homeFor, useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/queue', label: 'Live Queue' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data } = useFetch(() => endpoints.settings(), []);
  const s = data?.settings;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-lg px-3 py-2 text-sm transition-colors', isActive ? 'text-white' : 'text-muted hover:text-white');

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <Logo size={40} />
            <span className="truncate text-sm font-bold uppercase tracking-[0.14em]">The Shehraz Barber</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>
            ))}
            <NavLink to={user ? homeFor(user.role) : '/login'} className={linkCls}>{user ? 'Dashboard' : 'Staff login'}</NavLink>
            <Link to="/book" className="ml-2 inline-flex min-h-10 items-center rounded-xl bg-gold px-4 text-sm font-semibold text-ink hover:bg-gold-strong">
              Get Your Token
            </Link>
          </nav>
          <button
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-ink px-4 pb-5 pt-2 md:hidden">
            <div className="flex flex-col">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={({ isActive }) => cx('flex min-h-12 items-center rounded-lg px-2 text-base', isActive ? 'text-white' : 'text-muted')}>
                  {l.label}
                </NavLink>
              ))}
              <NavLink to={user ? homeFor(user.role) : '/login'} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-lg px-2 text-base text-muted">
                {user ? 'Dashboard' : 'Staff login'}
              </NavLink>
              <Link to="/book" onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold font-semibold text-ink">
                Get Your Token
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <p className="text-sm font-bold uppercase tracking-[0.14em]">The Shehraz Barber</p>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted">Digital tokens for a calmer wait. Style · Confidence.</p>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Explore</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link className="hover:text-white" to="/services">Services &amp; prices</Link></li>
              <li><Link className="hover:text-white" to="/book">Get your token</Link></li>
              <li><Link className="hover:text-white" to="/queue">Live queue</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Contact</p>
            <ul className="space-y-2 text-sm text-muted">
              <li>Address: {s?.address ?? <span className="italic">Not yet added by the salon</span>}</li>
              <li>Phone: {s?.phone ?? <span className="italic">Not yet added by the salon</span>}</li>
              {s?.instagramUrl && (
                <li>
                  <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                    <Instagram className="h-4 w-4" aria-hidden /> @the_shehraz_barber
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} The Shehraz Barber</div>
      </footer>
    </div>
  );
}
