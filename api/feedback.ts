import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return jsonResponse({ error: 'Message is required' }, 400);
  }

  const { error } = await resend.emails.send({
    from: 'Trailune Feedback <feedback@trailune.laddtnov.xyz>',
    to: ['novytskiyvladislav@proton.me'],
    subject: 'New Trailune feedback',
    html: `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
  });

  if (error) {
    return jsonResponse({ error: 'Failed to send feedback' }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}
