import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaImage } from './Media';
import { cx } from './ui';

const TAG = 'pointer-events-none absolute top-3 rounded-full border border-gold/40 bg-ink/75 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-strong backdrop-blur transition-opacity';

/**
 * Drag (or use the arrow keys) to compare. The "after" photo fills the frame and the "before"
 * photo is revealed from the left up to the handle. Vertical swipes still scroll the page.
 */
export function BeforeAfterSlider({ before, after, title }: { before: string; after: string; title: string }) {
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => dragging.current && moveTo(e.clientX);
  const stop = () => (dragging.current = false);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 25 : 5;
    const next = { ArrowLeft: pos - step, ArrowRight: pos + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPos(Math.min(100, Math.max(0, next)));
  };

  return (
    <figure className="group">
      <div
        ref={frame}
        role="slider"
        tabIndex={0}
        aria-label={`${title}: before and after`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={onKeyDown}
        className="relative aspect-[4/7] cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[1.5rem] border border-line bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <MediaImage src={after} alt={`${title}, after`} className="pointer-events-none" />
        {/* eager: browsers never trigger lazy loading for an image inside a clip-path layer */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <MediaImage src={before} alt={`${title}, before`} eager className="pointer-events-none" />
        </div>
        <span aria-hidden className={cx(TAG, 'left-3', pos < 18 && 'opacity-0')}>Before</span>
        <span aria-hidden className={cx(TAG, 'right-3', pos > 82 && 'opacity-0')}>After</span>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-gold-strong shadow-[0_0_12px_rgba(0,0,0,0.6)]" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold bg-ink/80 text-gold-strong shadow-xl backdrop-blur transition-transform group-hover:scale-110">
            <ChevronLeft className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
      <figcaption className="mt-3 font-display text-lg italic text-cream">{title}</figcaption>
    </figure>
  );
}
