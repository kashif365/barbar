import type { CustomerToken } from '../types';
import { STATUS_LABEL, formatDateTimeLong, formatPKR, waitText } from './format';

export const BRAND = 'The Shehraz Barber';
export const RECEIPT_FOOTER = 'Please arrive a few minutes before your turn and show this token to your barber. Keep this page open for live updates.';

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/** Queue details are shown ONLY when the server gave us real numbers. Nothing is estimated on the client. */
export function queueFacts(t: CustomerToken): { position: number | null; waitMinutes: number | null } {
  if (t.status !== 'waiting') return { position: null, waitMinutes: null };
  return {
    position: typeof t.queuePosition === 'number' ? t.queuePosition : null,
    waitMinutes: typeof t.estimatedWaitMinutes === 'number' ? t.estimatedWaitMinutes : null,
  };
}

/** Plain-text receipt used for native share, WhatsApp and the copy fallback. `url` is the customer's own tracking page. */
export function buildShareText(t: CustomerToken, url: string): string {
  const q = queueFacts(t);
  return [
    `${BRAND} · Token ${t.tokenNumber}`,
    `Name: ${t.customerName}`,
    `Service: ${t.serviceName}`,
    `Price: ${formatPKR(t.priceAtBooking)}`,
    `Booked: ${formatDateTimeLong(t.createdAt)}`,
    `Status: ${STATUS_LABEL[t.status]}`,
    ...(q.position !== null ? [`Queue position: ${q.position}`] : []),
    ...(q.waitMinutes !== null ? [`Estimated wait: ${waitText(q.waitMinutes)}`] : []),
    `Track your token: ${url}`,
  ].join('\n');
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const receiptFilename = (t: CustomerToken) => `shehraz-token-${t.tokenNumber.replace(/[^A-Za-z0-9-]/g, '')}.png`;

// ---------------------------------------------------------------- PNG rendering (canvas, no dependencies)

const C = { ink: '#080808', card: '#171717', line: '#303030', muted: '#a3a3a3', gold: '#b9a477', goldStrong: '#cdbb92', white: '#ffffff' };
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = '/logo.png';
    await img.decode();
    return img;
  } catch {
    return null; // the receipt is still valid without the emblem
  }
}

/** Draws the receipt from the real token data and returns a PNG. Throws if canvas is unavailable. */
export async function renderReceiptPng(t: CustomerToken): Promise<Blob> {
  const q = queueFacts(t);
  const rows: [string, string][] = [
    ['Customer', t.customerName],
    ['Service', t.serviceName],
    ['Price', formatPKR(t.priceAtBooking)],
    ['Booked', formatDateTimeLong(t.createdAt)],
    ['Status', STATUS_LABEL[t.status]],
  ];
  const queueRows: [string, string][] = [];
  if (q.position !== null) queueRows.push(['Queue position', String(q.position)]);
  if (q.waitMinutes !== null) queueRows.push(['Estimated wait', waitText(q.waitMinutes)]);

  const S = 2; // render at 2x for sharp text on phones
  const W = 540;
  const X = 56; // content left edge
  const inner = W - X * 2;
  const ROW = 46;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas is not supported');
  probe.font = `400 14px ${FONT}`;
  const footerLines = wrap(probe, RECEIPT_FOOTER, inner);

  const rowsTop = 324;
  const queueGap = queueRows.length ? 18 : 0;
  const footerTop = rowsTop + rows.length * ROW + queueGap + queueRows.length * ROW + 26;
  const H = footerTop + footerLines.length * 22 + 28 + 20;

  const canvas = document.createElement('canvas');
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');
  ctx.scale(S, S);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  // charcoal card with a gold border
  roundRect(ctx, 20, 20, W - 40, H - 40, 28);
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(185,164,119,0.6)';
  ctx.stroke();

  // header: emblem + brand
  const logo = await loadLogo();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(X + 26, 48 + 26, 26, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, X, 48, 52, 52);
    ctx.restore();
  }
  ctx.fillStyle = C.gold;
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(BRAND.toUpperCase().split('').join(' '), X + 68, 48 + 24);
  ctx.fillStyle = C.muted;
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText('Digital token', X + 68, 48 + 44);

  // greeting
  ctx.fillStyle = C.white;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(fit(ctx, `Hello, ${firstName(t.customerName)}`, inner), X, 136);
  ctx.fillStyle = C.muted;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(t.status === 'waiting' ? 'Your token is confirmed. You are in the queue.' : `Token status: ${STATUS_LABEL[t.status]}`, X, 160);

  // token number panel
  const py = 180;
  roundRect(ctx, X, py, inner, 120, 20);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.strokeStyle = 'rgba(185,164,119,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('YOUR TOKEN', X + inner / 2, py + 30);
  ctx.fillStyle = C.goldStrong;
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(t.tokenNumber, X + inner / 2, py + 92);
  ctx.textAlign = 'left';

  // detail rows: a divider ABOVE each row, text sits clear of the line
  let y = rowsTop;
  const drawRows = (list: [string, string][]) => {
    for (const [k, v] of list) {
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X, y);
      ctx.lineTo(X + inner, y);
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.font = `400 14px ${FONT}`;
      ctx.fillText(k, X, y + 29);
      ctx.fillStyle = C.white;
      ctx.font = `600 15px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(fit(ctx, v, inner * 0.62), X + inner, y + 29);
      ctx.textAlign = 'left';
      y += ROW;
    }
  };
  drawRows(rows);
  if (queueRows.length) {
    y += queueGap;
    drawRows(queueRows);
  }

  ctx.fillStyle = C.gold;
  ctx.font = `400 14px ${FONT}`;
  footerLines.forEach((line, i) => ctx.fillText(line, X, footerTop + 14 + i * 22));

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}
