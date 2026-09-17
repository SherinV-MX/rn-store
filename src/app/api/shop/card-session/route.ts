import { NextRequest, NextResponse } from 'next/server';

/* Exchanges card details for a Shopify vault session id.

   ── Why this route exists, and what it costs ──────────────────────────────────
   Shopify's card vault (deposit.shopifycs.com) sends no Access-Control-Allow-Origin
   header, so a browser on our domain cannot call it directly — the request dies in
   preflight. The only way to keep the card form inside our own page is to relay it
   here.

   That relay has a consequence worth stating plainly: the card number passes through
   our server. It is never written to disk, never logged, and never stored — but it is
   in our process memory for the length of one request, and that puts this deployment
   in PCI DSS SAQ D scope rather than the much lighter SAQ A that a hosted payment page
   gets.

   For a demo that is fine. Before this takes a real customer's card, the company has to
   either accept SAQ D and its obligations, or move the card field back to a payment
   page hosted by the provider. That is a business decision, not a code change. */

const VAULT = 'https://deposit.shopifycs.com/sessions';

export async function POST(request: NextRequest) {
    try {
        const { number, month, year, cvc, name } = await request.json();

        if (!number || !month || !year || !cvc) {
            return NextResponse.json({ error: 'incomplete_card' }, { status: 400 });
        }

        const res = await fetch(VAULT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credit_card: {
                    number: String(number).replace(/\s+/g, ''),
                    month: Number(month),
                    year: Number(String(year).length === 2 ? `20${year}` : year),
                    verification_value: String(cvc),
                    name: name ?? '',
                },
            }),
        });

        const body = await res.json().catch(() => ({}));

        /* Deliberately no logging of the response body or the request: a vault error can
           echo card fields back, and an error log is the classic way card numbers end up
           somewhere they should not be. */
        if (!res.ok || !body.id) {
            return NextResponse.json({ error: 'card_rejected' }, { status: 400 });
        }

        return NextResponse.json({ sessionId: body.id });
    } catch {
        console.error('Card session route failed');
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
