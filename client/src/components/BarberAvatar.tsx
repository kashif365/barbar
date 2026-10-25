import { useEffect, useState } from 'react';
import { barberAvatarSrc } from '../config/media';
import { initialsOf } from '../utils/format';
import { cx } from './ui';

/** Round portrait of a barber; their initials on gold when there is no photo (or it fails to load). */
export function BarberAvatar({ name, photoUrl, className }: { name: string; photoUrl?: string | null; className?: string }) {
  const src = barberAvatarSrc(name, photoUrl);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-card', className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="font-display text-gold-strong">{initialsOf(name)}</span>
      )}
    </span>
  );
}
