# PoC store provisioning

Builds the store described in *Shipping and VAT Rules: Spec for Shopify PoC* — eight test
articles, three zones, 66 weight brackets — and then replays the spec's own ten scenarios
against what actually landed in Shopify.

These scripts talk to the **Admin API**, which the app itself never does. `src/lib/shopify`
holds a Storefront token that may read products and write carts and nothing else; this
directory holds a token that can rewrite the store's shipping rates, so it stays out of the
app and is only ever run by hand.

## One-time setup

In the Shopify admin: **Settings → Apps and sales channels → Develop apps → Create an app**.
Under *Configuration → Admin API integration*, grant:

| Scope | Needed for |
|---|---|
| `write_products`, `read_products` | the eight test articles and the small-item metafield definition |
| `write_inventory`, `read_inventory` | variant weight and untracked stock, both of which live on the inventory item |
| `write_shipping`, `read_shipping` | zones and the weight-based rate tables |
| `write_publications`, `read_publications` | publishing the articles so the Storefront API can see them |

Install the app, then copy the **Admin API access token** (it starts `shpat_`) into `.env`:

```
SHOPIFY_ADMIN_TOKEN=shpat_...
```

The token is shown once. It is a full write credential for the store — `.env` is gitignored
and it should stay there.

## Running it

```bash
node scripts/shopify/setup.mjs inspect     # what the store looks like now; changes nothing
node scripts/shopify/setup.mjs metafield   # the small-item flag (§2)
node scripts/shopify/setup.mjs products    # the eight test articles (§2.1)
node scripts/shopify/setup.mjs shipping    # zones and 66 brackets (§4, §5, §8)
node scripts/shopify/setup.mjs verify      # replays §10 against the live store
node scripts/shopify/setup.mjs all         # the four write stages in order
```

`shipping` refuses to touch a delivery profile that already has zones. Re-run it with
`--replace-zones` to delete what is there and write the spec tables in their place.

Everything else is idempotent: products upsert by handle, the metafield definition is skipped
if present.

## Decisions baked into this setup

**Prices are net.** `TA-01` is stored as `1000.00`, not `1190.00`, and Shopify adds the 19%
at checkout. That is what makes §10's totals reproduce to the cent. The consequence is that
German consumer display (PAngV wants gross) is the Next.js storefront's job, not Shopify's.

**The €40 customs fee lives inside the Zone 2 rates.** §8 permits this — *"it does not have to
appear as a separate line"* — and it only works because §4 puts nothing but non-EU countries
in Zone 2. Zone 2 bracket 1 is stored as `105.00`, being 65.00 + 40.00. **If a real zone ever
mixes EU and non-EU destinations this breaks silently**, and the fee has to move to a Carrier
Service endpoint.

**Bracket boundaries are closed one gram below the next threshold.** The domestic 21.00 rate
runs `1g … 3299g` and the 22.00 rate starts at `3300g`, so exactly 3.3 kg costs 22.00 as §9
requires. Weights are held in grams throughout, because §9 asks for exact comparisons and
floating-point kilograms cannot give them.

**A 0 g cart matches no bracket.** Every table starts at 1 g, so Shopify stops checkout with
"no shipping available" instead of shipping for free — which is the behaviour §9 asks for,
arrived at by omission rather than by a rule.

## Why the weight brackets are not used

The 66 brackets are created correctly and the admin renders them correctly — `0.001-3.299kg`,
`3.3-5.299kg` and so on. Shopify's checkout does not evaluate them.

Established by adding probe rates to the Germany zone and asking the Cart API what it would
offer:

| Rate | Weight conditions | Offered to a 20 g cart? |
|---|---|---|
| `MANUAL TEST` | none | yes — correct |
| `MIN ONLY >= 50kg` | one (min) | **yes** — impossible |
| `MAX ONLY <= 3.299kg` | two (min 0 + max) | no — should have matched |
| `DHL Express (up to 3.3 kg)` | two | no — should have matched |
| `DHL Express (9.9 kg and over)` | one (min) | **yes** — impossible |

So a rate carrying one condition is treated as unconditional, and a rate carrying two is
dropped altogether. That is why every cart was quoted the top bracket whatever it weighed:
the top bracket is the only bracket in each zone with a single condition.

Ruled out along the way: the condition unit (tested in grams and in kilograms, and with
gram-valued numbers under a kilogram unit — all stored exactly as sent), the variant weight
unit, `requiresShipping`, `taxable`, missing inventory levels, duplicate rate names, the
shipping origin, and the delivery profile. `cartPrepareForCompletion` gives the same answer as
the Cart API, so this is what Shopify would charge, not an estimate.

Worth a Shopify support ticket. Note also that the admin's own **Add shipping option** dialog
offers no weight fields at all on this store, only a flat price — consistent with weight
conditions not being a supported feature here, even though the API accepts them.

Until it is resolved, the checkout page prices shipping itself from `src/lib/shipping/rates`,
and `/api/shop/rates` exists to hand Shopify the same figures as a carrier service. That
endpoint is registered but **inactive**: activating it needs Carrier Calculated Shipping,
which this plan does not include.

## What this setup does not do

**§7, the small-item flat rate.** Shopify rates can be conditioned on cart weight or cart
price, never on a product metafield, and §7 forbids deriving eligibility from weight (T5 is
the test that proves it). The `custom.small_item` flag is created and set correctly on all
eight articles, but nothing consumes it yet. `verify` skips T4 and reports whether the flags
themselves are right.

Enforcing it needs either the **Carrier Service API** (Advanced plan, any annual plan, or free
on a development store — this one qualifies) or a **delivery customization Function**
(Shopify Plus only).

**§6.3 row 3, EU reverse charge.** Zero-rating on a customer-entered VAT ID is a Plus B2B
feature or an app. `verify` skips T7. There is a second problem behind it: §6.4 puts the VAT
ID on the *invoice* address, which Shopify's checkout collects at the payment step — after
totals are shown — while §6.2 requires the customer to *see* net prices before paying.

**Tax configuration.** Shopify's tax settings have no Admin API, so these are clicks in
**Settings → Taxes and duties**, and they decide whether T1–T3, T6 and T10 come out right:

- Germany registered at 19%, and **"Charge tax on shipping" on** — §6's rule that shipping is
  an ancillary service following the goods.
- **"All prices include tax" off**, matching the net prices this script writes.
- For the EU, collect at the **domestic rate**, not destination rates. §6.4 is explicit:
  *"EU private customers are charged German 19%. We do not use destination VAT rates."*
  Shopify's default is the opposite, and left alone it will charge French 20% on T6 and miss
  the expected 752.08.
- Nothing registered outside the EU, so §6.3's export row is zero-rated by default.

**Markets.** The store reaches only Germany today. FR, NL, BE, ME, AL and GE must be sellable
under **Settings → Markets** or their addresses will be refused at checkout no matter what the
shipping zones say.
