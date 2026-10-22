import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Phone, Radio, Smartphone, Ticket, Scissors } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ServiceCard } from '../components/ServiceCard';
import { Card, ErrorState, SectionTitle, Skeleton } from '../components/ui';
import { useFetch } from '../hooks/useFetch';
import { endpoints } from '../services/api';

const steps = [
  { icon: Smartphone, title: 'Choose your service', text: 'Pick what you need from the live price list. Prices always come straight from the salon.' },
  { icon: Ticket, title: 'Get your digital token', text: 'Enter your name and receive a numbered token like A-007 — no paper slip, no account needed.' },
  { icon: Radio, title: 'Track your turn live', text: 'See your position and an approximate wait on your phone. Updates arrive in real time.' },
  { icon: Scissors, title: 'Walk in when called', text: 'Online and walk-in customers share one fair first-come, first-served queue.' },
];

export default function Home() {
  const services = useFetch(() => endpoints.services(), []);
  const settings = useFetch(() => endpoints.settings(), []);
  const s = settings.data?.settings;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">Style · Confidence</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">The Shehraz Barber</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              A modern barber shop with a calmer way to wait. Get your digital token from your phone, follow the queue live, and arrive when it’s nearly your turn.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold px-6 font-semibold text-ink hover:bg-gold-strong">
                Get Your Token <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/services" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-6 font-medium hover:border-gold/60">
                Explore Services
              </Link>
            </div>
            {s && !s.isOpen && (
              <p className="mt-5 text-sm text-warn">The salon is currently closed. Online tokens are available during operating hours.</p>
            )}
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="rounded-full border border-line p-3">
              <Logo size={220} className="max-w-[60vw]" />
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="Services" title="Straightforward grooming, clear prices">
          A selection of what we offer. The full list is on the services page.
        </SectionTitle>
        {services.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : services.error ? (
          <ErrorState message={services.error.message} onRetry={() => void services.reload()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.data?.items.slice(0, 3).map((sv) => <ServiceCard key={sv.id} service={sv} />)}
          </div>
        )}
        <Link to="/services" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-gold hover:text-gold-strong">
          View all services <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {/* How it works */}
      <section className="border-y border-line/60 bg-panel">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionTitle eyebrow="How it works" title="From phone to chair in four steps" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.title}>
                <Card className="h-full">
                  <div className="mb-4 flex items-center justify-between">
                    <st.icon className="h-6 w-6 text-gold" aria-hidden />
                    <span className="text-sm font-semibold text-muted">0{i + 1}</span>
                  </div>
                  <h3 className="font-semibold">{st.title}</h3>
                  <p className="mt-2 text-sm text-muted">{st.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Queue tracking */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Queue tracking" title="Know where you stand, always">
            Your tracking page shows your token, your place in line and an estimated wait. The estimate is approximate — it adjusts as services finish.
          </SectionTitle>
          <Link to="/queue" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-5 text-sm font-medium hover:border-gold/60">
            See the live queue
          </Link>
        </div>
        <Card className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Example token</p>
          <p className="my-3 text-6xl font-extrabold tracking-tight text-gold-strong">A-007</p>
          <p className="text-sm text-muted">Position 3 · Estimated wait about 45 min</p>
          <p className="mt-4 text-xs text-muted">Illustration only</p>
        </Card>
      </section>

      {/* Salon info — only real, owner-supplied details are shown */}
      <section className="border-t border-line/60 bg-panel">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionTitle eyebrow="Visit us" title="Salon information" />
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <MapPin className="mb-3 h-5 w-5 text-gold" aria-hidden />
              <p className="font-semibold">Address</p>
              <p className="mt-1 text-sm text-muted">{s?.address ?? 'Address not yet added by the salon.'}</p>
            </Card>
            <Card>
              <Clock className="mb-3 h-5 w-5 text-gold" aria-hidden />
              <p className="font-semibold">Opening hours</p>
              <p className="mt-1 text-sm text-muted">{s?.openTime && s?.closeTime ? `${s.openTime} – ${s.closeTime} (Pakistan time)` : 'Opening hours not yet added by the salon.'}</p>
            </Card>
            <Card>
              <Phone className="mb-3 h-5 w-5 text-gold" aria-hidden />
              <p className="font-semibold">Phone</p>
              <p className="mt-1 text-sm text-muted">{s?.phone ?? 'Phone number not yet added by the salon.'}</p>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
