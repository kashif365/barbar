import type { ReactNode } from 'react';
import { Eyebrow } from './ui';

/** Header band for the inner public pages (services, queue, booking, login). */
export function PageHero({ eyebrow, title, children, aside }: { eyebrow: string; title: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="grain relative overflow-hidden border-b border-line">
      <div aria-hidden className="bg-spotlight absolute inset-0" />
      <div aria-hidden className="stripe-accent absolute -right-10 top-0 h-full w-24 opacity-[0.06]" />
      <div className="rise relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-cream sm:text-6xl">{title}</h1>
          {children && <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{children}</p>}
        </div>
        {aside}
      </div>
    </section>
  );
}
