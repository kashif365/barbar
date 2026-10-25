import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Scissors } from 'lucide-react';
import { cx } from './ui';

type LoadState = 'loading' | 'ok' | 'missing';

/**
 * True when the visitor has not asked for less motion or less data. Read once per mount:
 * autoplaying video is the only thing it gates.
 */
export function allowsAutoplay(): boolean {
  if (typeof window === 'undefined') return false;
  const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !reduce && !saveData;
}

/**
 * Tracks the load state of the <img> it is attached to. The image itself does the loading (once,
 * honouring loading="lazy"); there is no separate preload. An image that finished before React
 * attached its handlers (cached) is picked up from `complete` / `naturalWidth`.
 */
function useImgState(src: string | undefined) {
  const [state, setState] = useState<LoadState>(src ? 'loading' : 'missing');
  useEffect(() => setState(src ? 'loading' : 'missing'), [src]);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setState(img.naturalWidth > 0 ? 'ok' : 'missing');
  }, []);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => setState(e.currentTarget.naturalWidth > 0 ? 'ok' : 'missing');
  const onError = () => setState('missing');
  return { state, ref, onLoad, onError };
}

/** Elegant stand-in used wherever a photo has not been added yet, or failed to load. */
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

/**
 * Fills its (positioned) parent. The placeholder sits underneath while the photo loads and is
 * shown on its own only if the photo fails, so a loaded photo is never hidden by state or CSS.
 */
export function MediaImage({
  src, alt, className, placeholderLabel, eager = false,
}: { src: string; alt: string; className?: string; placeholderLabel?: string; eager?: boolean }) {
  const { state, ref, onLoad, onError } = useImgState(src);
  return (
    <>
      {state !== 'ok' && <MediaPlaceholder className="absolute inset-0 h-full w-full" label={state === 'missing' ? placeholderLabel : undefined} />}
      {state !== 'missing' && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          className={cx('relative h-full w-full object-cover', className)}
        />
      )}
    </>
  );
}

/** Photo with a graceful fallback. */
export function SmartImage({ src, alt, className, imgClassName, placeholderLabel }: { src: string; alt: string; className?: string; imgClassName?: string; placeholderLabel?: string }) {
  return (
    <div className={cx('relative overflow-hidden bg-card', className)}>
      <MediaImage src={src} alt={alt} className={imgClassName} placeholderLabel={placeholderLabel} />
    </div>
  );
}

/**
 * Full-bleed background: the poster photo, with the video faded in over it once it is actually
 * playing. No video on reduced-motion or data saver, and if the browser blocks autoplay the poster
 * simply stays. Without a poster, a gold-lit gradient.
 */
export function BackdropMedia({ video, poster, className }: { video?: string; poster?: string; className?: string }) {
  const [posterOk, setPosterOk] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const allowVideo = useRef(allowsAutoplay()).current;
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // The autoPlay attribute is not enough everywhere (and StrictMode remounts); ask explicitly.
    // A rejection means autoplay is not permitted here, which is fine: the poster stays.
    v.muted = true;
    v.play().catch(() => {});
  }, [video]);

  return (
    <div className={cx('absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_70%_30%,#2a2216_0%,#0a0907_70%)]" />
      {poster && posterOk && (
        <img src={poster} alt="" fetchPriority="high" decoding="async" onError={() => setPosterOk(false)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {video && allowVideo && !videoFailed && (
        <video
          ref={ref}
          className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-1000', playing ? 'opacity-100' : 'opacity-0')}
          src={video}
          poster={poster && posterOk ? poster : undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(true)}
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}

/**
 * Muted, looping clip that plays only while at least a third of it is on screen and pauses when it
 * leaves. Nothing but the poster downloads until it first comes into view. When autoplay is off
 * (reduced motion, data saver) or refused by the browser, native controls appear so the visitor
 * can still start it.
 */
export function InViewVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const autoplay = useRef(allowsAutoplay()).current;
  const [controls, setControls] = useState(!autoplay);

  useEffect(() => {
    const v = ref.current;
    if (!v || !autoplay) return;
    if (!('IntersectionObserver' in window)) {
      setControls(true);
      return;
    }
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          v.play().catch((err: unknown) => {
            // AbortError = a pause() interrupted this play(); anything else means autoplay was refused.
            if (!(err instanceof DOMException && err.name === 'AbortError')) setControls(true);
          });
        } else if (!v.paused) {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      controls={controls}
      aria-label={label}
      className={className}
    />
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
