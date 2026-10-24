import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Clock, MapPin, Phone, Radio, Scissors, Smartphone, Ticket } from 'lucide-react';
import { BackdropMedia, MediaPlaceholder, Reveal, SmartImage, useImage } from '../components/Media';
import { Logo } from '../components/Logo';
import { ErrorState, Eyebrow, SectionTitle, Skeleton, cx } from '../components/ui';
import { MEDIA } from '../config/media';
import { useFetch } from '../hooks/useFetch';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { endpoints } from '../services/api';
import { formatPKR, waitText } from '../utils/format';

const steps = [
  { icon: Smartphone, title: 'Pick your service', text: 'Choose from the live price list. Prices come straight from the salon.' },
  { icon: Ticket, title: 'Get a digital token', text: 'Enter your name and receive a number like A-007. No account, no paper slip.' },
  { icon: Radio, title: 'Track it live', text: 'Watch your place in line from anywhere. Updates arrive in real time.' },
  { icon: Scissors, title: 'Take the chair', text: 'Arrive as your turn nears. Pay your barber in person after the cut.' },
];

export default function Home() {
  const services = useFetch(() => endpoints.services(), []);
  const settings = useFetch(() => endpoints.settings(), []);
  const queue = useFetch(() => endpoints.queueToday(), []);
  useLiveQueue(() => void queue.reload(true));
  const s = settings.data?.settings;
  const q = queue.data;
  const items = services.data?.items ?? [];

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="grain relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-0">
        <BackdropMedia video={MEDIA.heroVideo} poster={MEDIA.heroPoster} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/40 to-transparent" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rise">
            <Eyebrow>Est. 2023 · Premium grooming</Eyebrow>
            <h1 className="font-display text-[2.9rem] font-semibold leading-[1.02] text-cream sm:text-7xl lg:text-[5.5rem]">
              Sharp cuts.
              <br />
              <span className="text-gold-gradient italic">Zero waiting.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-cream/75 sm:text-lg">
              Take a digital token from your phone, follow the queue live, and walk in just as your barber is ready for you.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/book"
                className="bg-gold-gradient group inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-8 text-base font-bold text-ink shadow-[0_18px_40px_-14px_rgba(201,164,92,0.9)] transition hover:brightness-110"
              >
                Get Your Token <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                to="/services"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-cream/25 px-8 text-base font-semibold text-cream backdrop-blur transition hover:border-gold hover:text-gold-strong"
              >
                View Services
              </Link>
            </div>
            {s && !s.isOpen && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-warn">
                <Clock className="h-4 w-4" aria-hidden /> Closed right now — online tokens open during salon hours.
              </p>
            )}
          </div>

          {/* Live queue glass card */}
          <div className="rise hidden justify-end lg:flex" style={{ animationDelay: '200ms' }}>
            <Link
              to="/queue"
              className="group w-full max-w-sm rounded-[2rem] border border-gold/30 bg-ink/55 p-7 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl transition hover:border-gold/60"
            >
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-gold">Live queue</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span className="sb-pulse h-2 w-2 rounded-full bg-ok" aria-hidden /> Live
                </span>
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.22em] text-muted">Now serving</p>
              <p className="font-display text-gold-gradient mt-1 text-6xl font-semibold">
                {q?.nowServing.length ? q.nowServing[0].tokenNumber : '—'}
              </p>
              <div className="gold-hairline my-6" aria-hidden />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-display text-3xl text-cream">{q?.counts.waiting ?? '–'}</p>
                  <p className="text-xs text-muted">waiting now</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-cream">{q ? waitText(q.estimatedWaitForNewTokenMinutes).replace(/^about /i, '') : '–'}</p>
                  <p className="text-xs text-muted">est. wait if you book</p>
                </div>
              </div>
              <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-strong">
                See the full queue <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </p>
            </Link>
          </div>
        </div>

        <div aria-hidden className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-cream/50 sm:flex">
          Scroll
          <span className="relative h-9 w-5 rounded-full border border-cream/30">
            <span className="scroll-cue absolute left-1/2 top-1.5 h-2 w-0.5 -translate-x-1/2 rounded-full bg-gold" />
          </span>
        </div>
      </section>

      {/* ---------------- Marquee ---------------- */}
      {items.length > 0 && (
        <div className="overflow-hidden border-y border-line bg-panel py-5" aria-hidden>
          <div className="marquee flex w-max gap-10 whitespace-nowrap">
            {[...items, ...items, ...items, ...items].map((sv, i) => (
              <span key={i} className="flex items-center gap-10 font-display text-2xl italic text-cream/70 sm:text-3xl">
                {sv.name}
                <span className="text-base not-italic text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- About ---------------- */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
        <Reveal className="relative">
          <SmartImage src={MEDIA.about} alt="The Shehraz Barber team inside the shop" className="aspect-[4/5] rounded-[2rem] border border-line" placeholderLabel="The Shehraz Barber" />
          <div aria-hidden className="absolute -bottom-6 -right-2 hidden rounded-full border border-gold/40 bg-ink p-2 shadow-2xl sm:block lg:-right-8">
            <Logo size={120} />
          </div>
          <div aria-hidden className="stripe-accent absolute -left-3 top-10 hidden h-28 w-2 rounded-full sm:block" />
        </Reveal>
        <Reveal delay={120}>
          <SectionTitle eyebrow="About the shop" title={<>Where craft meets <span className="text-gold-gradient italic">confidence</span></>}>
            At The Shehraz Barber, every cut is done properly: a clean consultation, sharp tools, a steady hand and a finish that lasts. We built a digital
            queue so your time is respected as much as your style.
          </SectionTitle>
          <dl className="grid grid-cols-3 gap-4 border-t border-line pt-8">
            {[
              { k: '2023', v: 'Established' },
              { k: items.length ? String(items.length) : '—', v: 'Signature services' },
              { k: '1', v: 'Fair queue for all' },
            ].map((x) => (
              <div key={x.v}>
                <dt className="sr-only">{x.v}</dt>
                <dd className="font-display text-gold-gradient text-4xl font-semibold sm:text-5xl">{x.k}</dd>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">{x.v}</p>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* ---------------- Services menu ---------------- */}
      <section className="relative overflow-hidden border-y border-line bg-panel">
        <div aria-hidden className="bg-spotlight absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:py-28">
          <Reveal>
            <SectionTitle center eyebrow="The menu" title="Services & prices">
              Honest prices in PKR, set by the salon. Pay your barber in person after your service.
            </SectionTitle>
          </Reveal>
          {services.loading ? (
            <div className="grid gap-x-14 gap-y-6 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : services.error ? (
            <ErrorState message={services.error.message} onRetry={() => void services.reload()} />
          ) : (
            <ul className="grid gap-x-14 md:grid-cols-2">
              {items.slice(0, 8).map((sv, i) => (
                <Reveal as="li" key={sv.id} delay={(i % 2) * 80}>
                  <Link to={`/book?service=${sv.id}`} className="group block border-b border-line/80 py-5">
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-xl text-cream transition-colors group-hover:text-gold-strong sm:text-2xl">{sv.name}</span>
                      <span aria-hidden className="mb-1.5 flex-1 border-b border-dotted border-gold/30" />
                      <span className="shrink-0 font-semibold text-gold-strong">{formatPKR(sv.price)}</span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> ~{sv.durationMinutes} min
                      {sv.description && <span className="line-clamp-1">· {sv.description}</span>}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}
          <div className="mt-12 text-center">
            <Link to="/services" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-gold/50 px-7 text-sm font-bold uppercase tracking-[0.14em] text-gold-strong transition hover:bg-gold hover:text-ink">
              Full menu <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal>
          <SectionTitle eyebrow="How it works" title={<>From your phone <span className="text-gold-gradient italic">to the chair</span></>} />
        </Reveal>
        <ol className="grid gap-px overflow-hidden rounded-[2rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st, i) => (
            <Reveal as="li" key={st.title} delay={i * 100} className="group relative bg-ink p-8 transition-colors hover:bg-card">
              <span className="font-display text-gold-gradient text-6xl font-semibold opacity-90">0{i + 1}</span>
              <st.icon className="absolute right-8 top-9 h-6 w-6 text-gold/60 transition-colors group-hover:text-gold" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-6 font-display text-2xl text-cream">{st.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{st.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------------- Lookbook ---------------- */}
      <Lookbook />

      {/* ---------------- CTA band ---------------- */}
      <CtaBand />

      {/* ---------------- Visit ---------------- */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <SectionTitle eyebrow="Visit us" title="Find the shop" />
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: MapPin, label: 'Address', value: s?.address, empty: 'Address coming soon.' },
            { icon: Clock, label: 'Opening hours', value: s?.openTime && s?.closeTime ? `${s.openTime} – ${s.closeTime}` : null, empty: 'Hours coming soon.' },
            { icon: Phone, label: 'Phone', value: s?.phone, empty: 'Phone number coming soon.', href: s?.phone ? `tel:${s.phone}` : undefined },
          ].map((c, i) => (
            <Reveal key={c.label} delay={i * 100} className="rounded-[1.5rem] border border-line bg-gradient-to-b from-card to-panel p-7">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 text-gold">
                <c.icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-5 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-muted">{c.label}</p>
              {c.value ? (
                c.href ? <a href={c.href} className="mt-2 block font-display text-xl text-cream hover:text-gold-strong">{c.value}</a> : <p className="mt-2 font-display text-xl text-cream">{c.value}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">{c.empty}</p>
              )}
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

function GalleryTile({ src, caption, className, index }: { src: string; caption?: string; className?: string; index: number }) {
  const state = useImage(src);
  return (
    <Reveal delay={(index % 3) * 90} className={cx('group relative overflow-hidden rounded-[1.5rem] border border-line', className)}>
      {state === 'ok' ? (
        <img src={src} alt={caption ?? 'Work by The Shehraz Barber'} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <MediaPlaceholder className="h-full w-full" />
      )}
      {caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-5 pt-14">
          <p className="font-display text-xl italic text-cream">{caption}</p>
        </div>
      )}
    </Reveal>
  );
}

/** Portrait clip that plays (muted, looping) only while it is on screen; poster-only until then. */
function ReelCard({ src, poster, caption, index }: { src: string; poster: string; caption?: string; index: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const v = ref.current;
    if (!v || reduceMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? void v.play().catch(() => {}) : v.pause()), { threshold: 0.5 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduceMotion]);
  return (
    <Reveal delay={index * 90} className="group relative aspect-[9/16] w-[70%] shrink-0 snap-center overflow-hidden rounded-[1.5rem] border border-line bg-card sm:w-auto">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        controls={reduceMotion}
        aria-label={caption ?? 'Video from The Shehraz Barber'}
        className="h-full w-full object-cover"
      />
      {caption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-5 pt-14">
          <p className="font-display text-xl italic text-cream">{caption}</p>
        </div>
      )}
    </Reveal>
  );
}

function Lookbook() {
  const g = MEDIA.gallery;
  // Bento layout on large screens: first tile is tall, fourth is wide.
  const span = ['row-span-2', '', '', 'lg:col-span-2', '', 'col-span-2 lg:col-span-1'];
  return (
    <section className="border-t border-line bg-panel">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-28">
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionTitle eyebrow="Lookbook" title={<>Fresh from <span className="text-gold-gradient italic">the chair</span></>} />
        </Reveal>
        <div className="grid grid-flow-dense auto-rows-[12rem] grid-cols-2 gap-3 sm:auto-rows-[16rem] sm:gap-4 lg:auto-rows-[18rem] lg:grid-cols-4">
          {g.map((it, i) => (
            <GalleryTile key={it.src} src={it.src} caption={it.caption} index={i} className={span[i]} />
          ))}
        </div>
        {MEDIA.reels.length > 0 && (
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
            {MEDIA.reels.map((r, i) => (
              <ReelCard key={r.src} {...r} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CtaBand() {
  const bg = useImage(MEDIA.ctaBackground);
  return (
    <section className="grain relative overflow-hidden">
      {bg === 'ok' ? (
        <img src={MEDIA.ctaBackground} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_100%,#3a2d17_0%,#0a0907_70%)]" />
      )}
      <div aria-hidden className="absolute inset-0 bg-ink/75" />
      <Reveal className="relative mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
        <Eyebrow center>Your chair is waiting</Eyebrow>
        <h2 className="font-display text-4xl font-semibold leading-tight text-cream sm:text-6xl">
          Skip the crowd. <span className="text-gold-gradient italic">Keep your time.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-cream/70">Get your token in under a minute and we’ll keep your place in line.</p>
        <Link
          to="/book"
          className="bg-gold-gradient mt-10 inline-flex min-h-14 items-center gap-2 rounded-full px-10 text-base font-bold text-ink shadow-[0_18px_40px_-14px_rgba(201,164,92,0.9)] transition hover:brightness-110"
        >
          Get Your Token <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </Reveal>
    </section>
  );
}
