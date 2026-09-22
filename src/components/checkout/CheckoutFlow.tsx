'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/shop/CartProvider';
import { formatMoney } from '@/lib/shopify/format';
import type { Cart } from '@/lib/shopify/types';
import { quote, totals } from '@/lib/shipping/rates';
import { itemsFromCart, goodsNetCents } from '@/lib/shipping/from-cart';
import styles from './Checkout.module.css';

export interface CheckoutDict {
    title: string;
    contact: string;
    email: string;
    phone: string;
    shipping: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    zip: string;
    country: string;
    delivery: string;
    noShipping: string;
    payment: string;
    cardNumber: string;
    expiry: string;
    cvc: string;
    nameOnCard: string;
    pay: string;
    paying: string;
    summary: string;
    subtotal: string;
    shippingLine: string;
    tax: string;
    total: string;
    calculated: string;
    free: string;
    empty: string;
    backToStore: string;
    successTitle: string;
    successBody: string;
    cardNote: string;
    otherMethods: string;
    noPayment: string;
    placeOrder: string;
    company: string;
    vatId: string;
    vatIdNote: string;
    vatReverseCharge: string;
    vatExport: string;
    smallItemPost: string;
    noWeight: string;
    noZone: string;
    goods: string;
}

/* The countries the shop actually has rates for — sections 4 and 10.1. Offering more would
   put a buyer through the whole form only to be told at the end that we cannot deliver. */
const COUNTRIES = ['DE', 'BE', 'NL', 'FR', 'ME', 'AL', 'GE'];

/* Section 6.1 requires the country to be picked from a list rather than typed, because every
   rule downstream depends on knowing exactly which one it is. The list stores the ISO code and
   shows the name in the reader's language — "Deutschland" to a German buyer — so the value we
   send Shopify never depends on how it was displayed. */
function countryOptions(locale: string) {
    const names = new Intl.DisplayNames([locale === 'de' ? 'de-DE' : 'en-GB'], { type: 'region' });
    return COUNTRIES
        .map((code) => ({ code, name: names.of(code) ?? code }))
        .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/* The card goes to /api/shop/card-session, which relays it to Shopify's vault and returns an
   opaque session id. Not directly to the vault: it sends no CORS headers, so a browser on our
   domain cannot call it. See that route for what the relay costs us in PCI terms. */
async function vaultCard(card: {
    number: string; month: string; year: string; cvc: string; name: string;
}): Promise<string> {
    const res = await fetch('/api/shop/card-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.sessionId) throw new Error('card_rejected');
    return body.sessionId as string;
}

export default function CheckoutFlow({ locale, dict }: { locale: string; dict: CheckoutDict }) {
    const { cart, setCart, ready } = useCart();

    const [form, setForm] = useState({
        email: '', phone: '',
        firstName: '', lastName: '',
        address1: '', address2: '', city: '', zip: '', countryCode: 'DE',
        /* Section 6.1: both optional, both on the invoice address. A private customer leaves
           them empty and never sees anything about VAT numbers. */
        company: '', vatId: '',
    });
    /* Which shipping option the buyer picked. Section 7 can offer two for a German cart, and
       the choice is theirs, so it is held here rather than derived. */
    const [shippingChoice, setShippingChoice] = useState<string | null>(null);
    const [card, setCard] = useState({ number: '', month: '', year: '', cvc: '', name: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));
    const setCardField = (key: keyof typeof card) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setCard((c) => ({ ...c, [key]: e.target.value }));

    const call = async (payload: Record<string, unknown>) => {
        const res = await fetch('/api/shop/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, locale }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? data.error ?? 'checkout_error');
        if (data.cart) setCart(data.cart as Cart);
        return data;
    };

    /* Address and contact are pushed as the buyer leaves the block, so Shopify can quote
       shipping and tax before they reach the card — the totals on the right are then real,
       not a guess we would have to correct at the end. */
    const syncDetails = async () => {
        if (!form.email || !form.address1 || !form.city || !form.zip) return;
        setError(null);
        try {
            setBusy(true);
            await call({ action: 'contact', email: form.email, phone: form.phone, countryCode: form.countryCode });
            await call({
                action: 'address',
                address: {
                    firstName: form.firstName, lastName: form.lastName,
                    address1: form.address1, address2: form.address2,
                    city: form.city, zip: form.zip, countryCode: form.countryCode, phone: form.phone,
                },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'error');
        } finally {
            setBusy(false);
        }
    };

    const pay = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await syncDetails();
            /* A cart that owes nothing skips the card entirely — there is nothing to charge,
               so asking for one would be theatre. */
            const sessionId = owesNothing ? undefined : await vaultCard(card);
            const { result } = await call({
                action: 'pay',
                sessionId,
                billingAddress: {
                    firstName: form.firstName, lastName: form.lastName,
                    address1: form.address1, address2: form.address2,
                    city: form.city, zip: form.zip, countryCode: form.countryCode, phone: form.phone,
                },
            });

            if (result?.status === 'success' || result?.status === 'already_accepted') {
                setDone(true);
                setCart(null);
                return;
            }
            setError(result?.errors?.join(' ') ?? 'payment_failed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'error');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className={styles.doneBox}>
                <h1 className={styles.doneTitle}>{dict.successTitle}</h1>
                <p className={styles.doneBody}>{dict.successBody}</p>
                <Link href={`/${locale}`} className={styles.doneLink}>{dict.backToStore}</Link>
            </div>
        );
    }

    /* Say nothing until the cart has actually been fetched — an empty-cart message that
       appears for half a second and then vanishes is worse than a blank moment. */
    if (!ready) return <div className={styles.doneBox} aria-busy="true" />;

    if (!cart || cart.lines.length === 0) {
        return (
            <div className={styles.doneBox}>
                <p className={styles.doneBody}>{dict.empty}</p>
                <Link href={`/${locale}`} className={styles.doneLink}>{dict.backToStore}</Link>
            </div>
        );
    }

    /* Shipping and VAT are worked out here, not read off the cart. Shopify quotes the dearest
       rate in the destination's zone whatever the cart weighs and returns no tax at all, so
       its own figures cannot be put in front of a buyer. See lib/shipping/rates. */
    const currencyCode = cart.cost.subtotalAmount.currencyCode;
    const money = (cents: number) => formatMoney({ amount: (cents / 100).toFixed(2), currencyCode }, locale);

    const shipping = quote(itemsFromCart(cart), form.countryCode, form.vatId);
    const chosen = shipping.options.find((o) => o.id === shippingChoice) ?? shipping.options[0] ?? null;
    const sums = totals(goodsNetCents(cart), chosen?.netCents ?? 0, shipping.vatApplies);

    const optionLabel = (id: string, label: string) => (id === 'small-item' ? dict.smallItemPost : label);
    const owesNothing = sums.totalCents === 0;

    return (
        <form className={styles.layout} onSubmit={pay}>
            <div className={styles.form}>
                <h1 className={styles.title}>{dict.title}</h1>

                <section className={styles.block}>
                    <h2 className={styles.blockTitle}>{dict.contact}</h2>
                    <input
                        className={styles.input} type="email" required placeholder={dict.email}
                        value={form.email} onChange={set('email')} onBlur={syncDetails} autoComplete="email"
                    />
                    <input
                        className={styles.input} type="tel" placeholder={dict.phone}
                        value={form.phone} onChange={set('phone')} autoComplete="tel"
                    />
                </section>

                <section className={styles.block}>
                    <h2 className={styles.blockTitle}>{dict.shipping}</h2>
                    <div className={styles.row}>
                        <input
                            className={styles.input} required placeholder={dict.firstName}
                            value={form.firstName} onChange={set('firstName')} autoComplete="given-name"
                        />
                        <input
                            className={styles.input} required placeholder={dict.lastName}
                            value={form.lastName} onChange={set('lastName')} autoComplete="family-name"
                        />
                    </div>
                    <input
                        className={styles.input} required placeholder={dict.address1}
                        value={form.address1} onChange={set('address1')} onBlur={syncDetails}
                        autoComplete="address-line1"
                    />
                    <input
                        className={styles.input} placeholder={dict.address2}
                        value={form.address2} onChange={set('address2')} autoComplete="address-line2"
                    />
                    <div className={styles.row}>
                        <input
                            className={styles.input} required placeholder={dict.zip}
                            value={form.zip} onChange={set('zip')} onBlur={syncDetails} autoComplete="postal-code"
                        />
                        <input
                            className={styles.input} required placeholder={dict.city}
                            value={form.city} onChange={set('city')} onBlur={syncDetails}
                            autoComplete="address-level2"
                        />
                    </div>
                    <select
                        className={styles.input} value={form.countryCode}
                        onChange={(e) => { set('countryCode')(e); }} onBlur={syncDetails}
                        aria-label={dict.country}
                    >
                        {countryOptions(locale).map(({ code, name }) => (
                            <option key={code} value={code}>{name}</option>
                        ))}
                    </select>
                    <input
                        className={styles.input} placeholder={dict.company}
                        value={form.company} onChange={set('company')} autoComplete="organization"
                    />
                    <input
                        className={styles.input} placeholder={dict.vatId}
                        value={form.vatId} onChange={set('vatId')} onBlur={syncDetails}
                    />
                    <p className={styles.note}>{dict.vatIdNote}</p>
                </section>

                <section className={styles.block}>
                    <h2 className={styles.blockTitle}>{dict.delivery}</h2>
                    {/* Section 9: a cart with no shipping weight would travel for nothing, so
                        it is stopped here rather than allowed through checkout. */}
                    {shipping.blocked === 'no-weight' && <p className={styles.note}>{dict.noWeight}</p>}
                    {shipping.blocked === 'no-zone' && <p className={styles.note}>{dict.noZone}</p>}

                    {shipping.options.length > 0 ? (
                        <div className={styles.options}>
                            {/* Section 7: a qualifying German cart sees the flat rate and the
                                express rate side by side and picks. The flat rate is an extra
                                option, never a replacement. */}
                            {shipping.options.map((option) => {
                                const on = chosen?.id === option.id;
                                return (
                                    <button
                                        key={option.id} type="button" disabled={busy}
                                        className={`${styles.option} ${on ? styles.optionOn : ''}`}
                                        onClick={() => setShippingChoice(option.id)}
                                    >
                                        <span>{optionLabel(option.id, option.label)}</span>
                                        {/* Net, like the summary beside it and like Shopify's
                                            own checkout, which lists shipping net and puts
                                            the tax on its own line. Showing one gross figure
                                            here and net everywhere else made the same order
                                            read as two different prices. */}
                                        <span>
                                            {option.netCents === 0 ? dict.free : money(option.netCents)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : shipping.blocked === null && (
                        <p className={styles.note}>{dict.noShipping}</p>
                    )}
                </section>

                <section className={styles.block}>
                    <h2 className={styles.blockTitle}>{dict.payment}</h2>
                    {owesNothing ? (
                        <p className={styles.note}>{dict.noPayment}</p>
                    ) : (
                    <>
                    <input
                        className={styles.input} required placeholder={dict.cardNumber} inputMode="numeric"
                        value={card.number} onChange={setCardField('number')} autoComplete="cc-number"
                    />
                    <div className={styles.row}>
                        <input
                            className={styles.input} required placeholder="MM" inputMode="numeric" maxLength={2}
                            value={card.month} onChange={setCardField('month')} autoComplete="cc-exp-month"
                        />
                        <input
                            className={styles.input} required placeholder="YYYY" inputMode="numeric" maxLength={4}
                            value={card.year} onChange={setCardField('year')} autoComplete="cc-exp-year"
                        />
                        <input
                            className={styles.input} required placeholder={dict.cvc} inputMode="numeric" maxLength={4}
                            value={card.cvc} onChange={setCardField('cvc')} autoComplete="cc-csc"
                        />
                    </div>
                    <input
                        className={styles.input} required placeholder={dict.nameOnCard}
                        value={card.name} onChange={setCardField('name')} autoComplete="cc-name"
                    />
                    <p className={styles.note}>{dict.cardNote}</p>
                    </>
                    )}
                </section>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <button type="submit" className={styles.pay} disabled={busy}>
                    {busy
                        ? dict.paying
                        : owesNothing
                            ? dict.placeOrder
                            : `${dict.pay} ${money(sums.totalCents)}`}
                </button>

                {/* PayPal, Klarna and the other redirect-based methods cannot be completed
                    through the cart API — they need the round trip to the provider that only
                    Shopify's own checkout performs. Rather than pretend they do not exist, this
                    hands the same cart over. Contact and address are pushed first, so the buyer
                    arrives with the fields already filled instead of typing them twice. */}
                <button
                    type="button" className={styles.alt} disabled={busy}
                    onClick={async () => {
                        await syncDetails();
                        window.location.href = cart.checkoutUrl;
                    }}
                >
                    {dict.otherMethods}
                </button>
            </div>

            <aside className={styles.summary}>
                <h2 className={styles.blockTitle}>{dict.summary}</h2>

                <ul className={styles.lines}>
                    {cart.lines.map((line) => (
                        <li key={line.id} className={styles.line}>
                            {line.merchandise.image && (
                                <Image
                                    className={styles.thumb} src={line.merchandise.image.url}
                                    alt={line.merchandise.product.title} width={56} height={56}
                                />
                            )}
                            <div className={styles.lineBody}>
                                <p className={styles.lineName}>{line.merchandise.product.title}</p>
                                <p className={styles.lineQty}>× {line.quantity}</p>
                            </div>
                            <span className={styles.linePrice}>{formatMoney(line.cost.totalAmount, locale)}</span>
                        </li>
                    ))}
                </ul>

                {/* Net throughout, with the VAT on its own line, because section 6 requires a
                    customer entitled to net pricing to see net prices before paying rather
                    than be charged and refunded afterwards. */}
                <dl className={styles.totals}>
                    <div><dt>{dict.goods}</dt><dd>{money(sums.goodsNetCents)}</dd></div>
                    <div>
                        <dt>{dict.shippingLine}</dt>
                        <dd>{chosen ? money(sums.shippingNetCents) : dict.calculated}</dd>
                    </div>
                    <div>
                        <dt>{dict.tax}</dt>
                        <dd>
                            {shipping.vatApplies
                                ? money(sums.vatCents)
                                : (shipping.zone?.eu ? dict.vatReverseCharge : dict.vatExport)}
                        </dd>
                    </div>
                    <div className={styles.grand}>
                        <dt>{dict.total}</dt><dd>{money(sums.totalCents)}</dd>
                    </div>
                </dl>
            </aside>
        </form>
    );
}
