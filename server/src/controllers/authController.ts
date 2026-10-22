import { User } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { verifyPassword } from '../utils/password';
import { loginSchema } from '../validators';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '../middleware/auth';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await verifyPassword(password, user?.passwordHash);
  // Same message for unknown email, wrong password and deactivated account.
  if (!user || !ok || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  res.cookie(SESSION_COOKIE, signSession(String(user._id)), sessionCookieOptions);
  res.json({ user: user.toJSON() });
});

export const logout = asyncHandler(async (_req, res) => {
  const { maxAge: _maxAge, ...opts } = sessionCookieOptions;
  res.clearCookie(SESSION_COOKIE, opts);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user!.toJSON() });
});
