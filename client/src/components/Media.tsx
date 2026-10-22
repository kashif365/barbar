import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Scissors } from 'lucide-react';
import { cx } from './ui';

type LoadState = 'loading' | 'ok' | 'missing';

/** Checks whether an image exists and decodes, without rendering a broken <img>. */
export function useImage(src: string | undefined): LoadState {
  const [state, setState] = useState<LoadState>(src ? 'loading' : 'missing');
  useEffect(() => {
    if (!src) return setState('missing');
    let alive = true;
    setState('loading');
    const img = new Image();
    img.onload = () => alive && setState(img.naturalWidth > 0 ? 'ok' : 'missing');
    img.onerror = () => alive && setState('missing');
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return state;
}

/** Elegant stand-in used wherever a photo has not been added yet. */
export function MediaPlaceholder({ className, label, icon }: { className?: string; label?: string; icon?: ReactNode }) {
  return (
    <div className={cx('relative flex items-center justify-center overflow-hidden bg-card', className)} aria-hidden={!label}>
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgb(201_164_92/0.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_48%,rgb(201_164_92/0.07)_48%_52%,transparent_52%)] bg-[length:22px_22px]" />
      <div className="relative flex flex-col items-center gap-3 text-gold/70">
        {icon ?? <Scissors className="h-8 w-8" strokeWidth={1.25} />}
        {label && <span className="font-display text-lg italic text-cream/80">{label}</span>}
      </div>
    </div>
  );
}

/** Photo with a graceful fallback; fades in once loaded. */
export function SmartImage({ src, alt, className, imgClassName, placeholderLabel }: { src: string; alt: string; className?: string; imgClassName?: string; placeholderLabel?: string }) {
  const state = useImage(src);
  if (state === 'missing') return <MediaPlaceholder className={className} label={placeholderLabel} />;
  return (
    <div className={cx('relative overflow-hidden bg-card', className)}>
      {state === 'ok' && <img src={src} alt={alt} loading="lazy" decoding="async" className={cx('rise h-full w-full object-cover', imgClassName)} />}
    </div>
  );
}

/**
 * Full-bleed background: video if present (muted, looping, never on reduced-motion or data saver),
 * otherwise the poster photo, otherwise a gold-lit gradient.
 */
export function BackdropMedia({ video, poster, className }: { video?: string; poster?: string; className?: string }) {
  const posterState = useImage(poster);
  const [videoOk, setVideoOk] = useState(false);
  const allowVideo = useRef(
    typeof window !== 'undefined' &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches &&
      !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  ).current;

  return (
    <div className={cx('absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_70%_30%,#2a2216_0%,#0a0907_70%)]" />
      {posterState === 'ok' && <img src={poster} alt="" className="rise absolute inset-0 h-full w-full object-cover" />}
      {video && allowVideo && (
        <video
          className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-1000', videoOk ? 'opacity-100' : 'opacity-0')}
          src={video}
          poster={posterState === 'ok' ? poster : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoOk(true)}
          onError={() => setVideoOk(false)}
        />
      )}
    </div>
  );
}

/** Fades children in when they scroll into view. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' | 'section' }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={cx('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
