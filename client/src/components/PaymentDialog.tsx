import { useState } from 'react';
import { Button, Field, Modal, inputCls } from './ui';
import { useAction } from '../hooks/useAction';
import { endpoints } from '../services/api';
import type { StaffToken } from '../types';
import { formatPKR } from '../utils/format';

type Method = 'cash' | 'card' | 'mobile_wallet';

/** Records a payment separately from service completion. The server rejects duplicates. */
export function PaymentDialog({ token, onClose, onDone }: { token: StaffToken; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(token.priceAtBooking));
  const [method, setMethod] = useState<Method>('cash');
  const { busy, run } = useAction();
  const n = Number(amount);
  const invalid = amount.trim() === '' || !Number.isFinite(n) || n < 0;

  const submit = async () => {
    if (invalid) return;
    const r = await run('pay', () => endpoints.recordPayment(token.id, { amount: n, method }), `Payment recorded for ${token.tokenNumber}.`);
    if (r) onDone();
  };

  return (
    <Modal open onClose={onClose} title={`Record payment · ${token.tokenNumber}`}>
      <p className="mb-4 text-sm text-muted">{token.serviceName} · booked at {formatPKR(token.priceAtBooking)}</p>
      <div className="space-y-4">
        <Field label="Amount received (PKR)" htmlFor="pay-amount" error={invalid ? 'Enter a valid amount' : undefined}>
          <input id="pay-amount" inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method" htmlFor="pay-method">
          <select id="pay-method" className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_wallet">Mobile wallet</option>
          </select>
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy === 'pay'}>Cancel</Button>
          <Button variant="primary" loading={busy === 'pay'} disabled={invalid} onClick={() => void submit()}>Record payment</Button>
        </div>
      </div>
    </Modal>
  );
}
