'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/shop/CartProvider';
import { formatMoney } from '@/lib/shopify/format';
import type { Cart } from '@/lib/shopify/types';
import { quote, totals, vatIdLooksValid } from '@/lib/shipping/rates';
import type { RateCard } from '@/lib/shipping/rates';
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
    vatIdShopifyNote: string;
    continueSecure: string;
    estimate: string;
}

/* Section 6.1 requires the country to be picked from a list rather than typed, because every
   rule downstream depends on knowing exactly which one it is. The list stores the ISO code and
   shows the name in the reader's language — "Deutschland" to a German buyer — so the value we
   send Shopify never depends on how it was displayed.

   The countries come from the zones in Shopify, so adding one to a zone in the admin puts it
   in this dropdown with no deploy. Offering a country we have no rate for would put a buyer
   through the whole form only to be told at the end that we cannot deliver. */
function countryOptions(locale: string, card: RateCard | null) {
    const names = new Intl.DisplayNames([locale === 'de' ? 'de-DE' : 'en-GB'], { type: 'region' });
    const codes = [...new Set((card?.zones ?? []).flatMap((z) => z.countries))];
    return codes
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

export default function CheckoutFlow({ locale, dict, rateCard }: {
    locale: string;
    dict: CheckoutDict;
    /* The zones, brackets and fees, read from Shopify on the server (section 4). null when
       the store has no rate card, or Shopify could not be reached. */
    rateCard: RateCard | null;
}) {
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
    /* What Shopify says this order costs, once it will tell us. Shopify computes the tax and
       it is Shopify that takes the money, so its figures are the ones shown — ours are only
       an estimate until the address is complete enough for Shopify to answer. */
    const [liveCost, setLiveCost] = useState<Cart['cost'] | null>(null);
    /* syncDetails runs from an onBlur that was created before the buyer picked a rate, so the
       choice is read through a ref rather than closed over. */
    const chosenRef = useRef<number | undefined>(undefined);
    /* Shipping and VAT are worked out here, not read off the cart. Shopify quotes the dearest
       rate in the destination's zone whatever the cart weighs, so its own figures cannot be
       put in front of a buyer. See lib/shipping/rates — the numbers come from Shopify, the
       rules from us. */
    const shipping = rateCard && cart
        ? quote(rateCard, itemsFromCart(cart), form.countryCode, form.vatId)
        : null;
    const chosen = shipping
        ? shipping.options.find((o) => o.id === shippingChoice) ?? shipping.options[0] ?? null
        : null;

    /* The buyer may never touch the delivery options — the first is selected for them — so the
       chosen rate is tracked here rather than only when one is clicked. syncDetails runs from
       an onBlur created before any of this existed, hence the ref. */
    useEffect(() => { chosenRef.current = chosen?.netCents; }, [chosen?.netCents]);
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
            /* Shopify can price it now, so replace our estimate with its figures. */
            if (chosenRef.current !== undefined) await selectChosenDelivery(chosenRef.current);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'error');
        } finally {
            setBusy(false);
        }
    };

    /* Hands Shopify the delivery option the buyer actually picked.

       Shopify does not fetch carrier rates until the cart is prepared for completion, so the
       cart's delivery groups are empty right up to that moment — and with nothing selected,
       Shopify silently takes the cheapest rate it is offered. A buyer who chose DHL Express
       would then be charged for the small item post. Preparing first makes the options
       appear; matching on price rather than on the label keeps it working in both languages.

       If the option cannot be matched, this throws rather than paying: charging an amount the
       buyer did not agree to is far worse than a failed checkout. */
    const selectChosenDelivery = async (netCents: number) => {
        await call({ action: 'prepare' });
        let fresh = (await call({ action: 'cart' }) as { cart: Cart }).cart;

        for (const group of fresh.deliveryGroups) {
            const match = group.deliveryOptions.find(
                (o) => Math.round(Number.parseFloat(o.estimatedCost.amount) * 100) === netCents,
            );
            if (!match) continue;
            if (group.selectedDeliveryOption?.handle !== match.handle) {
                fresh = (await call({ action: 'delivery', groupId: group.id, handle: match.handle }) as { cart: Cart }).cart;
                /* Prepare again so the tax is recalculated against the rate just chosen. */
                await call({ action: 'prepare' });
                fresh = (await call({ action: 'cart' }) as { cart: Cart }).cart;
            }
            setLiveCost(fresh.cost);
            return;
        }
        throw new Error('delivery_option_unavailable');
    };

    /* Asks Shopify to price the order as it stands. Quiet on failure: an address that is not
       yet complete is the normal case, not an error worth showing. */
    const refreshLiveCost = async (netCents: number | undefined) => {
        if (netCents === undefined || !form.email || !form.address1 || !form.city || !form.zip) return;
        try {
            await selectChosenDelivery(netCents);
        } catch {
            setLiveCost(null);
        }
    };

    const pay = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await syncDetails();
            if (chosen) await selectChosenDelivery(chosen.netCents);

            /* A VAT number can only be entered, and only be checked, on Shopify's checkout. */
            if (needsShopifyCheckout && cart?.checkoutUrl) {
                window.location.assign(cart.checkoutUrl);
                return;
            }
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

    /* Computed above, before the early returns, so an effect can watch the chosen rate. */
    const sums = totals(
        goodsNetCents(cart),
        chosen?.netCents ?? 0,
        shipping?.vatApplies ?? true,
        shipping?.vatRate ?? 19,
    );

    const optionLabel = (id: string, label: string) => (id === 'small-item' ? dict.smallItemPost : label);

    /* Shopify's figures win wherever it has given us any. It computes the tax and it takes
       the money, so showing our own arithmetic beside it would only invite the two to differ.
       Ours stands in until the address is complete enough for Shopify to answer. */
    const cents = (m: { amount: string } | null | undefined) =>
        (m ? Math.round(Number.parseFloat(m.amount) * 100) : null);
    const liveTotal = cents(liveCost?.totalAmount);
    const liveTax = cents(liveCost?.totalTaxAmount);
    const shownGoods = cents(liveCost?.subtotalAmount) ?? sums.goodsNetCents;
    const shownShipping = chosen?.netCents ?? sums.shippingNetCents;
    const shownTotal = liveTotal ?? sums.totalCents;
    const confirmed = liveTotal !== null;

    /* Section 6.4's reverse charge cannot happen here: the Storefront cart has no field for a
       VAT number — only companyLocationId, which is Plus B2B — so Shopify never sees it and
       would charge the tax anyway. Rather than show a net total Shopify will not honour, an
       order carrying a VAT number is sent to Shopify's own checkout, which has the field and
       validates it against VIES. */
    const needsShopifyCheckout = vatIdLooksValid(form.vatId);
    const owesNothing = shownTotal === 0;

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
                        {countryOptions(locale, rateCard).map(({ code, name }) => (
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
                    {shipping?.blocked === 'no-weight' && <p className={styles.note}>{dict.noWeight}</p>}
                    {shipping?.blocked === 'no-zone' && <p className={styles.note}>{dict.noZone}</p>}

                    {shipping && shipping.options.length > 0 ? (
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
                                        onClick={() => { setShippingChoice(option.id); void refreshLiveCost(option.netCents); }}
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
                    ) : shipping?.blocked === null && (
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

                {needsShopifyCheckout && <p className={styles.note}>{dict.vatIdShopifyNote}</p>}

                <button type="submit" className={styles.pay} disabled={busy}>
                    {busy
                        ? dict.paying
                        : needsShopifyCheckout
                            ? dict.continueSecure
                            : owesNothing
                                ? dict.placeOrder
                                : `${dict.pay} ${money(shownTotal)}`}
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
                    <div><dt>{dict.goods}</dt><dd>{money(shownGoods)}</dd></div>
                    <div>
                        <dt>{dict.shippingLine}</dt>
                        <dd>{chosen ? money(shownShipping) : dict.calculated}</dd>
                    </div>
                    <div>
                        <dt>{dict.tax}</dt>
                        <dd>
                            {liveTax !== null
                                ? money(liveTax)
                                /* A VAT number is checked by Shopify, not here, so until it
                                   has ruled we say so instead of promising an exemption. */
                                : needsShopifyCheckout
                                    ? dict.calculated
                                    : shipping?.vatApplies
                                        ? money(sums.vatCents)
                                        : (shipping?.zone?.eu ? dict.vatReverseCharge : dict.vatExport)}
                        </dd>
                    </div>
                    <div className={styles.grand}>
                        <dt>{dict.total}</dt>
                        <dd>{liveTotal === null && needsShopifyCheckout ? dict.calculated : money(shownTotal)}</dd>
                    </div>
                </dl>
                {!confirmed && <p className={styles.note}>{dict.estimate}</p>}
            </aside>
        </form>
    );
}
