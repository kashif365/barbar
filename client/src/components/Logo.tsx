import { cx } from './ui';

/** The official The Shehraz Barber emblem (public/logo.png). Do not substitute another logo. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="The Shehraz Barber logo"
      width={size}
      height={size}
      className={cx('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}
