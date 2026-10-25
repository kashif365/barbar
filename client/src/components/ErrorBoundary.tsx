import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. the URL), a caught error is cleared and the children re-render. */
  resetKey?: unknown;
  /** `page` keeps the surrounding layout; `app` is the last line of defence and fills the screen. */
  scope?: 'page' | 'app';
}

interface State {
  failed: boolean;
}

/**
 * Catches render errors so one broken screen shows a message instead of a blank page.
 * Data-loading failures are handled where the data is used (error states); this is for the rest.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen failed to render:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const app = this.props.scope === 'app';
    return (
      <div role="alert" className={app ? 'flex min-h-screen items-center justify-center bg-ink px-4 text-cream' : 'mx-auto max-w-md px-4 py-24'}>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-bad/30 bg-bad/5 px-6 py-8 text-center">
          <AlertTriangle className="h-7 w-7 text-bad" aria-hidden />
          <p className="font-display text-xl text-cream">Something went wrong on this page.</p>
          <p className="max-w-sm text-sm text-muted">Please reload. If it keeps happening, try again in a few minutes.</p>
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center rounded-xl bg-gold px-5 font-semibold text-ink">
              Reload
            </button>
            {!app && (
              <a href="/" className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 font-semibold text-cream">
                Home
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
}
