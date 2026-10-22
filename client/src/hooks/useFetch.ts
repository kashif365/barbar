import { useCallback, useEffect, useRef, useState } from 'react';
import { toProblem, type ApiProblem } from '../services/api';

interface FetchState<T> {
  data: T | null;
  error: ApiProblem | null;
  loading: boolean;
  /** Refetch. `silent` keeps current data on screen (used for live updates, no skeleton flash). */
  reload: (silent?: boolean) => Promise<void>;
}

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async (silent = false) => {
    const mine = ++seq.current; // ignore out-of-order responses
    if (!silent) setLoading(true);
    try {
      const r = await fnRef.current();
      if (mine === seq.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      if (mine === seq.current) setError(toProblem(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}
