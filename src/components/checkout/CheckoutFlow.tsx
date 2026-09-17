'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/shop/CartProvider';
import { formatMoney } from '@/lib/shopify/format';
import type { Cart } from '@/lib/shopify/types';
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
}

const COUNTRIES = ['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'PL', 'IT', 'ES'];

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
    });
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

    const chooseDelivery = async (groupId: string, handle: string) => {
        setError(null);
        try {
            setBusy(true);
            await call({ action: 'delivery', groupId, handle });
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

    const group = cart.deliveryGroups[0];
    const shippingCost = group?.selectedDeliveryOption?.estimatedCost;
    const owesNothing = Number.parseFloat(cart.cost.totalAmount.amount) === 0;

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
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </section>

                <section className={styles.block}>
                    <h2 className={styles.blockTitle}>{dict.delivery}</h2>
                    {group ? (
                        <div className={styles.options}>
                            {group.deliveryOptions.map((option) => {
                                const chosen = group.selectedDeliveryOption?.handle === option.handle;
                                return (
                                    <button
                                        key={option.handle} type="button" disabled={busy}
                                        className={`${styles.option} ${chosen ? styles.optionOn : ''}`}
                                        onClick={() => chooseDelivery(group.id, option.handle)}
                                    >
                                        <span>{option.title ?? option.handle}</span>
                                        <span>
                                            {Number(option.estimatedCost.amount) === 0
                                                ? dict.free
                                                : formatMoney(option.estimatedCost, locale)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* No groups means nothing in the cart needs shipping, or the address has
                           not been filled in far enough for Shopify to quote. Either way there is
                           nothing to choose yet, and saying so beats an empty box. */
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
                            : `${dict.pay} ${formatMoney(cart.cost.totalAmount, locale)}`}
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

                <dl className={styles.totals}>
                    <div><dt>{dict.subtotal}</dt><dd>{formatMoney(cart.cost.subtotalAmount, locale)}</dd></div>
                    <div>
                        <dt>{dict.shippingLine}</dt>
                        <dd>
                            {shippingCost
                                ? (Number(shippingCost.amount) === 0 ? dict.free : formatMoney(shippingCost, locale))
                                : dict.calculated}
                        </dd>
                    </div>
                    <div>
                        <dt>{dict.tax}</dt>
                        <dd>{cart.cost.totalTaxAmount ? formatMoney(cart.cost.totalTaxAmount, locale) : dict.calculated}</dd>
                    </div>
                    <div className={styles.grand}>
                        <dt>{dict.total}</dt><dd>{formatMoney(cart.cost.totalAmount, locale)}</dd>
                    </div>
                </dl>
            </aside>
        </form>
    );
}
