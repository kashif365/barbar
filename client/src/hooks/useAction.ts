import { useCallback, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { toProblem } from '../services/api';

/**
 * Runs one mutation at a time. A synchronous ref lock (not React state) means a rapid double
 * click can never fire two requests, which protects against duplicate state transitions.
 * `busy` is the key of the running action so a specific button can show its spinner.
 */
export function useAction() {
  const toast = useToast();
  const lock = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      if (lock.current) return undefined;
      lock.current = true;
      setBusy(key);
      try {
        const r = await fn();
        if (successMessage) toast.success(successMessage);
        return r;
      } catch (e) {
        toast.error(toProblem(e).message);
        return undefined;
      } finally {
        lock.current = false;
        setBusy(null);
      }
    },
    [toast],
  );

  return { busy, run };
}
