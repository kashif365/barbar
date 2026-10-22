import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, RefreshCw } from 'lucide-react';
import { Banner, Button, ConfirmDialog, ErrorState, Skeleton } from '../components/ui';
import { ReceiptActions } from '../components/ReceiptActions';
import { TokenReceipt } from '../components/TokenReceipt';
import { useToast } from '../context/ToastContext';
import { useAction } from '../hooks/useAction';
import { useFetch } from '../hooks/useFetch';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { endpoints } from '../services/api';

export default function TokenPage() {
  const { trackingToken = '' } = useParams();
  const toast = useToast();
  const { data, error, loading, reload } = useFetch(() => endpoints.getToken(trackingToken), [trackingToken]);
  const connected = useLiveQueue(() => void reload(true));
  const { busy, run } = useAction();
  const [confirm, setConfirm] = useState(false);

  const t = data?.token;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied. Keep it to reopen this page.');
    } catch {
      toast.error('Could not copy. Bookmark this page instead.');
    }
  };

  const cancel = async () => {
    const r = await run('cancel', () => endpoints.cancelOwnToken(trackingToken), 'Your token has been cancelled.');
    if (r) {
      setConfirm(false);
      void reload(true);
    }
  };

  return (
    <div className="relative">
    <div aria-hidden className="bg-spotlight pointer-events-none absolute inset-x-0 top-0 h-96" />
    <div className="relative mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      {loading && !t ? (
        <div className="space-y-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-40" />
        </div>
      ) : error && !t ? (
        error.status === 404 ? (
          <ErrorState message="We couldn’t find this token. Check the link, or get a new token." onRetry={() => void reload()} />
        ) : (
          <ErrorState message={error.message} onRetry={() => void reload()} />
        )
      ) : t ? (
        <div className="space-y-4">
          <TokenReceipt t={t} connected={connected} />
          <ReceiptActions t={t} />

          {t.status === 'skipped' && <Banner tone="warn">You were skipped because you were not present when called. Please speak to the reception to re-enter the queue.</Banner>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void reload(true)} className="flex-1"><RefreshCw className="h-4 w-4" aria-hidden /> Refresh</Button>
            <Button onClick={copyLink} className="flex-1"><Copy className="h-4 w-4" aria-hidden /> Copy link</Button>
            {t.canCancel && <Button variant="danger" onClick={() => setConfirm(true)} className="flex-1">Cancel token</Button>}
          </div>
          <p className="text-center text-xs text-muted">
            Estimated wait is approximate and changes as the queue moves. <Link to="/queue" className="underline hover:text-cream">See the full queue</Link>
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm}
        title="Cancel this token?"
        message={`Token ${t?.tokenNumber ?? ''} will leave the queue and cannot be restored. You can get a new token, but it will go to the back of the queue.`}
        confirmLabel="Cancel my token"
        danger
        loading={busy === 'cancel'}
        onConfirm={() => void cancel()}
        onClose={() => setConfirm(false)}
      />
    </div>
    </div>
  );
}
