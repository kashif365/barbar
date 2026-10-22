export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details);

export function isDuplicateKeyError(e: unknown): e is { code: 11000; keyPattern?: Record<string, number> } {
  return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
}
