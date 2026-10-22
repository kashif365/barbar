import { useEffect, useState } from 'react';
import type { CustomerToken } from '../types';
import { renderReceiptPng } from '../utils/receipt';

/**
 * Pre-renders the receipt PNG from the live token data, so Share/Download act instantly inside the user's tap
 * (mobile browsers only allow native sharing directly from a user gesture). Purely client-side:
 * it never calls the booking API.
 */
export function useReceiptImage(t: CustomerToken | undefined) {
  const [state, setState] = useState<{ blob: Blob | null; failed: boolean }>({ blob: null, failed: false });
  const key = t ? `${t.tokenNumber}|${t.status}|${t.queuePosition}|${t.estimatedWaitMinutes}|${t.customerName}|${t.serviceName}|${t.priceAtBooking}|${t.createdAt}` : '';

  useEffect(() => {
    if (!t) return;
    let alive = true;
    renderReceiptPng(t)
      .then((blob) => alive && setState({ blob, failed: false }))
      .catch(() => alive && setState({ blob: null, failed: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
