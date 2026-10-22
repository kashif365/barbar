import { useState } from 'react';
import { Download, MessageCircle, Share2 } from 'lucide-react';
import { Button, Modal, cx } from './ui';
import { useToast } from '../context/ToastContext';
import { useReceiptImage } from '../hooks/useReceiptImage';
import type { CustomerToken } from '../types';
import { buildShareText, receiptFilename, whatsappUrl } from '../utils/receipt';

/**
 * Share / WhatsApp / Download for a receipt. All three are pure client-side actions on data that is already
 * loaded: none of them calls the booking API, so they can never create another booking or token.
 */
export function ReceiptActions({ t }: { t: CustomerToken }) {
  const toast = useToast();
  const { blob, failed } = useReceiptImage(t);
  const [sharing, setSharing] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = buildShareText(t, url);

  const copyOrShow = async (why: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${why} The token details were copied; paste them into any app.`);
    } catch {
      setFallbackText(text); // clipboard blocked: show the text so it can be selected manually
    }
  };

  const share = async () => {
    if (sharing) return;
    if (typeof navigator.share !== 'function') {
      await copyOrShow('Sharing is not supported in this browser.');
      return;
    }
    setSharing(true);
    try {
      const file = blob ? new File([blob], receiptFilename(t), { type: 'image/png' }) : null;
      // Prefer the receipt image plus text; otherwise share the text (which already contains the tracking link).
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Token ${t.tokenNumber}`, text, files: [file] });
      else await navigator.share({ title: `Token ${t.tokenNumber}`, text });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) await copyOrShow('Could not open the share sheet.');
    } finally {
      setSharing(false);
    }
  };

  const download = () => {
    if (!blob) {
      void copyOrShow('The image could not be created in this browser.');
      return;
    }
    const href = URL.createObjectURL(blob);
    if (!('download' in document.createElement('a'))) {
      setPreview(href); // very old browsers: show the image so it can be saved with a long press
      return;
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = receiptFilename(t);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    toast.success('Token image saved.');
  };

  const btn = 'w-full';
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Share or save your token">
        <Button variant="primary" size="lg" className={cx(btn, 'sm:col-span-2')} loading={sharing} onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden /> Share Token
        </Button>
        <a
          href={whatsappUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gold/60 bg-card px-4 text-sm font-semibold text-gold-strong transition-colors hover:bg-gold/10"
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> Share on WhatsApp
        </a>
        <Button size="lg" className={btn} disabled={!blob && !failed} loading={!blob && !failed} onClick={download}>
          <Download className="h-4 w-4" aria-hidden /> Download Token
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">Anyone with your tracking link can see this token’s status. Phone numbers are never shown.</p>

      <Modal open={fallbackText !== null} onClose={() => setFallbackText(null)} title="Copy your token details">
        <p className="mb-3 text-sm text-muted">Select the text below and copy it, then paste it into any app.</p>
        <textarea
          readOnly
          rows={9}
          className="w-full rounded-xl border border-line bg-panel p-3 text-sm text-white"
          value={fallbackText ?? ''}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Token details"
        />
        <div className="mt-4 flex justify-end"><Button onClick={() => setFallbackText(null)}>Close</Button></div>
      </Modal>
      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Save your token">
        <p className="mb-3 text-sm text-muted">Press and hold the image, then choose “Save image”.</p>
        {preview && <img src={preview} alt={`Token ${t.tokenNumber} receipt`} className="w-full rounded-xl" />}
        <div className="mt-4 flex justify-end"><Button onClick={() => setPreview(null)}>Close</Button></div>
      </Modal>
    </>
  );
}
