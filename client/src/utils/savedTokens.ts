// Per-device convenience only: remembers recent tracking links so a customer who closes the tab can reopen them.
// Browser storage can be unavailable (private mode), so every access is guarded.
const KEY = 'sb_recent_tokens';

export interface SavedToken {
  trackingToken: string;
  tokenNumber: string;
  businessDate: string;
}

export function loadSavedTokens(): SavedToken[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedToken[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToken(t: SavedToken): void {
  try {
    const next = [t, ...loadSavedTokens().filter((x) => x.trackingToken !== t.trackingToken)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
