import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Clock, Instagram, MapPin, Menu, Phone, X } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
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
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data } = useFetch(() => endpoints.settings(), []);
  const s = data?.settings;
  // Only the home page has a full-bleed hero for the header to float over.
  const overHero = pathname === '/' && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cx(
      'relative px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] transition-colors',
      'after:absolute after:inset-x-3 after:-bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform',
      isActive ? 'text-gold-strong after:scale-x-100' : 'text-cream/75 after:scale-x-0 hover:text-cream hover:after:scale-x-100',
    );

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-40 transition-all duration-500',
          overHero ? 'bg-transparent' : 'border-b border-line/70 bg-ink/85 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl',
        )}
      >
        <div className={cx('mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-all duration-500 sm:px-6', overHero ? 'h-20' : 'h-16')}>
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo size={overHero ? 48 : 40} className="ring-1 ring-gold/40 transition-all duration-500" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-lg font-semibold text-cream">The Shehraz Barber</span>
              <span className="hidden text-[0.62rem] font-bold uppercase tracking-[0.32em] text-gold sm:block">Style · Confidence</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>
            ))}
            <NavLink to={user ? homeFor(user.role) : '/login'} className={linkCls}>{user ? 'Dashboard' : 'Staff'}</NavLink>
            <Link
              to="/book"
              className="bg-gold-gradient ml-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-sm font-bold text-ink shadow-[0_10px_30px_-12px_rgba(201,164,92,0.8)] transition hover:brightness-110"
            >
              Get Your Token <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
          <button
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-cream hover:bg-white/5 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="rise border-t border-line bg-ink px-4 pb-6 pt-2 md:hidden">
            <div className="flex flex-col">
              {[...links, { to: user ? homeFor(user.role) : '/login', label: user ? 'Dashboard' : 'Staff login', end: false }].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => cx('flex min-h-13 items-center border-b border-line/60 px-1 font-display text-2xl', isActive ? 'text-gold-strong' : 'text-cream')}
                >
                  {l.label}
                </NavLink>
              ))}
              <Link to="/book" className="bg-gold-gradient mt-5 inline-flex min-h-13 items-center justify-center rounded-full font-bold text-ink">
                Get Your Token
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className={cx('flex-1', pathname !== '/' && 'pt-16')}>
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="relative overflow-hidden border-t border-line bg-panel">
        <div aria-hidden className="bg-spotlight pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-4">
                <Logo size={64} className="ring-1 ring-gold/40" />
                <div>
                  <p className="font-display text-2xl font-semibold">The Shehraz Barber</p>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.32em] text-gold">Style · Confidence</p>
                </div>
              </div>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
                Precision cuts, sharp fades and proper shaves — with a digital token so you never wait in a crowded room again.
              </p>
              <Link to="/book" className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-gold-strong hover:text-gold">
                Get your token <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div>
              <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-gold">Explore</p>
              <ul className="space-y-3 text-sm text-cream/80">
                <li><Link className="hover:text-gold-strong" to="/services">Services &amp; prices</Link></li>
                <li><Link className="hover:text-gold-strong" to="/book">Get your token</Link></li>
                <li><Link className="hover:text-gold-strong" to="/queue">Live queue</Link></li>
                <li><Link className="hover:text-gold-strong" to={user ? homeFor(user.role) : '/login'}>Staff area</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-gold">Visit</p>
              <ul className="space-y-3 text-sm text-cream/80">
                {s?.address && <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{s.address}</li>}
                {s?.openTime && s?.closeTime && <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{s.openTime} – {s.closeTime}</li>}
                {s?.phone && <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /><a href={`tel:${s.phone}`} className="hover:text-gold-strong">{s.phone}</a></li>}
                {s?.instagramUrl && (
                  <li>
                    <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-gold-strong">
                      <Instagram className="h-4 w-4 text-gold" aria-hidden /> @the_shehraz_barber
                    </a>
                  </li>
                )}
                {!s?.address && !s?.phone && <li className="text-muted">Contact details coming soon.</li>}
              </ul>
            </div>
          </div>
          <div className="gold-hairline mt-14" aria-hidden />
          <div className="mt-6 flex flex-col items-center justify-between gap-2 text-xs text-muted sm:flex-row">
            <p>© {new Date().getFullYear()} The Shehraz Barber. All rights reserved.</p>
            <p className="uppercase tracking-[0.2em]">Est. 2023</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
