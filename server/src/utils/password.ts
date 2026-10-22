import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const ROUNDS = env.isTest ? 4 : 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

export async function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}
