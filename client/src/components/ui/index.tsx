import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import type { TokenStatus } from '../../types';
import { STATUS_LABEL } from '../../utils/format';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  size?: 'md' | 'lg' | 'sm';
}
const variants: Record<Variant, string> = {
  primary:
    'bg-gold-gradient text-ink font-bold shadow-[0_10px_30px_-12px_rgba(201,164,92,0.7)] hover:brightness-110 hover:shadow-[0_14px_36px_-12px_rgba(201,164,92,0.85)]',
  secondary: 'border border-line bg-card/80 text-cream hover:border-gold/60 hover:text-gold-strong',
  ghost: 'text-muted hover:text-cream hover:bg-white/5',
  danger: 'border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
};
const sizes = { sm: 'min-h-9 px-3.5 text-sm', md: 'min-h-11 px-5 text-sm', lg: 'min-h-13 px-7 text-base' };

export function Button({ variant = 'secondary', size = 'md', loading, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ---------- Layout primitives ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-gradient-to-b from-card to-panel p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] sm:p-5', className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold text-cream sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Eyebrow({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <p className={cx('mb-3 flex items-center gap-3 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-gold', center && 'justify-center')}>
      <span aria-hidden className="h-px w-8 bg-gold/60" />
      {children}
      {center && <span aria-hidden className="h-px w-8 bg-gold/60" />}
    </p>
  );
}

export function SectionTitle({ eyebrow, title, children, center }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={cx('mb-10 max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <Eyebrow center={center}>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl font-semibold leading-tight text-cream sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

// ---------- Badges ----------
const statusStyle: Record<TokenStatus, string> = {
  waiting: 'border-warn/40 bg-warn/10 text-warn',
  in_service: 'border-gold/50 bg-gold/10 text-gold-strong',
  completed: 'border-ok/40 bg-ok/10 text-ok',
  skipped: 'border-line bg-white/5 text-muted',
  cancelled: 'border-bad/40 bg-bad/10 text-bad',
};
export function StatusBadge({ status }: { status: TokenStatus }) {
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', statusStyle[status])}>{STATUS_LABEL[status]}</span>;
}
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'warn' | 'ok' }) {
  const t = { neutral: 'border-line text-muted', gold: 'border-gold/50 text-gold-strong', warn: 'border-warn/40 bg-warn/10 text-warn', ok: 'border-ok/40 text-ok' }[tone];
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', t)}>{children}</span>;
}

// ---------- Feedback ----------
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('sb-pulse rounded-xl bg-white/5', className)} />;
}
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-10 text-center">
      <Inbox className="h-7 w-7 text-gold/60" strokeWidth={1.5} aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-bad/30 bg-bad/5 px-6 py-8 text-center">
      <AlertTriangle className="h-7 w-7 text-bad" aria-hidden />
      <p className="max-w-md text-sm">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
export function Banner({ tone, children }: { tone: 'warn' | 'info' | 'bad'; children: ReactNode }) {
  const t = { warn: 'border-warn/40 bg-warn/10 text-warn', info: 'border-gold/40 bg-gold/10 text-gold-strong', bad: 'border-bad/40 bg-bad/10 text-bad' }[tone];
  return <div role={tone === 'bad' ? 'alert' : 'note'} className={cx('rounded-xl border px-4 py-3 text-sm', t)}>{children}</div>;
}
export function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={connected ? 'Updating live' : 'Reconnecting — refreshing periodically'}>
      <span className={cx('h-2 w-2 rounded-full', connected ? 'bg-ok' : 'bg-warn sb-pulse')} aria-hidden />
      {connected ? 'Live' : 'Reconnecting'}
    </span>
  );
}

// ---------- Forms ----------
export const inputCls =
  'w-full min-h-11 rounded-xl border border-line bg-ink/60 px-3.5 text-base text-cream placeholder:text-muted/60 transition-colors focus:border-gold focus:bg-ink focus:outline-none focus:ring-2 focus:ring-gold/20 sm:text-sm disabled:opacity-60';

export function Field({ label, error, hint, htmlFor, children }: { label: string; error?: string; hint?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------- Dialogs ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        // keep keyboard focus inside the dialog
        const f = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx('rise flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-gold/25 bg-gradient-to-b from-card to-panel shadow-2xl shadow-black outline-none sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="-m-2 rounded-full p-2 text-muted hover:bg-white/5 hover:text-cream">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title}>
      <p className="text-sm text-muted">{props.message}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={props.onClose} disabled={props.loading}>Keep as is</Button>
        <Button variant={props.danger ? 'danger' : 'primary'} loading={props.loading} onClick={props.onConfirm}>
          {props.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function SourceLabel({ source }: { source: 'online' | 'walk-in' }) {
  return <>{source === 'online' ? 'Online' : 'Walk-in'}</>;
}
export function SourceBadge({ source }: { source: 'online' | 'walk-in' }) {
  return <Pill tone={source === 'online' ? 'gold' : 'neutral'}>{source === 'online' ? 'Online' : 'Walk-in'}</Pill>;
}

// ---------- Stats ----------
export function StatCard({ label, value, sub, icon, accent }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: boolean }) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5',
        accent ? 'border-gold/40 bg-gradient-to-br from-gold/15 via-card to-panel' : 'border-line bg-gradient-to-b from-card to-panel',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
        {icon && <span className="text-gold/70">{icon}</span>}
      </div>
      <p className={cx('mt-2 font-display text-3xl font-semibold sm:text-4xl', accent ? 'text-gold-gradient' : 'text-cream')}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
