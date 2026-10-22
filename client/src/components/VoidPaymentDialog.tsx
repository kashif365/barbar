import { useState } from 'react';
import { Button, Field, Modal, inputCls } from './ui';
import { useAction } from '../hooks/useAction';
import { endpoints } from '../services/api';
import type { StaffToken } from '../types';
import { formatDateTime, formatPKR } from '../utils/format';

/** Owner-only correction: marks a paid token as unpaid again. The payment record is kept and audit-logged. */
export function VoidPaymentDialog({ token, onClose, onDone }: { token: StaffToken; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const { busy, run } = useAction();

  const submit = async () => {
    const r = await run('void', () => endpoints.voidPayment(token.id, reason.trim()), `${token.tokenNumber} marked as unpaid.`);
    if (r) onDone();
  };

  return (
    <Modal open onClose={onClose} title={`Mark unpaid · ${token.tokenNumber}`}>
      <p className="mb-4 text-sm text-muted">
        The {token.paidAmount !== null ? formatPKR(token.paidAmount) : ''} payment recorded {token.paidAt ? formatDateTime(token.paidAt) : ''} will stop counting as revenue.
        The record is kept and this change is written to the audit log. You can record a new payment afterwards.
      </p>
      <div className="space-y-4">
        <Field label="Reason (optional)" htmlFor="void-reason" hint="For example: entered by mistake">
          <input id="void-reason" maxLength={200} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy === 'void'}>Keep as paid</Button>
          <Button variant="danger" loading={busy === 'void'} onClick={() => void submit()}>Mark as unpaid</Button>
        </div>
      </div>
    </Modal>
  );
}
