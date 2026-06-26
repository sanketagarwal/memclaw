/**
 * Push a message to an external surface, addressed as `kind:address`, e.g.
 * `telegram:123456789` or `slack:C0123ABCD`.
 *
 * This calls each platform's send API directly (using the same bot token the
 * channel uses), so it works for proactively-initiated messages — like a
 * scheduled digest — that don't originate from an inbound webhook.
 */

export interface DeliveryTarget {
  kind: string;
  address: string;
}

export interface DeliveryResult {
  ok: boolean;
  detail: string;
}

/** Parse "telegram:12345" into { kind: 'telegram', address: '12345' }. */
export function parseDeliveryTarget(raw?: string): DeliveryTarget | undefined {
  if (!raw) return undefined;
  const idx = raw.indexOf(':');
  if (idx === -1) return undefined;
  const kind = raw.slice(0, idx).trim().toLowerCase();
  const address = raw.slice(idx + 1).trim();
  if (!kind || !address) return undefined;
  return { kind, address };
}

export async function deliver(target: DeliveryTarget, text: string): Promise<DeliveryResult> {
  switch (target.kind) {
    case 'telegram': {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return { ok: false, detail: 'TELEGRAM_BOT_TOKEN not set' };
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: target.address, text }),
        });
        return res.ok
          ? { ok: true, detail: 'sent' }
          : { ok: false, detail: `telegram http ${res.status}` };
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    }

    case 'slack': {
      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) return { ok: false, detail: 'SLACK_BOT_TOKEN not set' };
      try {
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ channel: target.address, text }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        return body.ok
          ? { ok: true, detail: 'sent' }
          : { ok: false, detail: `slack ${body.error ?? res.status}` };
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    }

    default:
      return { ok: false, detail: `unknown delivery kind "${target.kind}"` };
  }
}
