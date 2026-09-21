/* Admin API client, for provisioning only.

   Deliberately separate from src/lib/shopify: that client holds a Storefront token, which may
   read products and write carts and nothing else. This one holds an Admin token that can
   create products and rewrite shipping rates, so it lives outside the app, never ships to the
   browser, and is only ever run by hand from the command line. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2026-01';

/* Reads .env without a dependency. Values may be quoted or bare; anything after the first
   equals sign belongs to the value. */
export function loadEnv() {
    let raw = '';
    try {
        raw = readFileSync(join(ROOT, '.env'), 'utf8');
    } catch {
        throw new Error('No .env found at the project root.');
    }
    for (const line of raw.split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m) continue;
        const value = m[2].trim().replace(/^["'](.*)["']$/, '$1');
        if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
}

export class AdminError extends Error {
    constructor(message, detail) {
        super(message);
        this.name = 'AdminError';
        this.detail = detail;
    }
}

function host() {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    if (!domain) throw new AdminError('SHOPIFY_STORE_DOMAIN is not set in .env');
    return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/* Apps created in the Dev Dashboard no longer hand out a copyable Admin token — since
   January 2026 you get a client id and secret and exchange them for a short-lived one
   through the client credentials grant. Legacy custom apps still have a shpat_ token, so
   SHOPIFY_ADMIN_TOKEN is honoured first if it happens to be set. */
let cached = null;

async function accessToken() {
    if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
    if (cached && cached.expires > Date.now()) return cached.token;

    const id = process.env.SHOPIFY_CLIENT_ID;
    const secret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!id || !secret) {
        throw new AdminError(
            'No Admin credentials in .env.\n' +
            '  Dev Dashboard -> your app -> App settings -> Credentials, then add both to .env:\n' +
            '    SHOPIFY_CLIENT_ID=...\n' +
            '    SHOPIFY_CLIENT_SECRET=...',
        );
    }

    const res = await fetch(`https://${host()}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
    }).catch(err => { throw new AdminError('Could not reach the token endpoint', err); });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.access_token) {
        throw new AdminError(`Token exchange failed (HTTP ${res.status})`, body);
    }

    /* Client credentials tokens are short-lived; renew a minute before they lapse. */
    const ttl = (body.expires_in ?? 3600) * 1000;
    cached = { token: body.access_token, expires: Date.now() + ttl - 60_000, scope: body.scope };
    return cached.token;
}

/* What the exchanged token is actually allowed to do — printed by `inspect`, because a
   missing scope shows up as a confusing permission error several stages later. */
export function grantedScopes() {
    return cached?.scope ?? null;
}

/* One GraphQL call. Throws on transport failure, on GraphQL errors, and on any userErrors the
   caller points at with `userErrorsAt` — a provisioning script that half-succeeds silently is
   worse than one that stops. */
export async function admin(query, variables = {}, userErrorsAt = []) {
    const token = await accessToken();
    const url = `https://${host()}/admin/api/${API_VERSION}/graphql.json`;

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query, variables }),
        });
    } catch (err) {
        throw new AdminError('Admin API unreachable', err);
    }

    if (res.status === 401 || res.status === 403) {
        throw new AdminError(
            `Admin API rejected the token (HTTP ${res.status}). Either SHOPIFY_ADMIN_TOKEN is wrong, ` +
            'or the app is missing a scope this stage needs.',
        );
    }
    /* Shopify throttles by query cost; one retry is enough at this volume. */
    if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2000));
        return admin(query, variables, userErrorsAt);
    }

    const body = await res.json().catch(() => null);
    if (!res.ok || !body) throw new AdminError(`Admin API returned HTTP ${res.status}`, body);
    if (body.errors) throw new AdminError('GraphQL error', body.errors);

    for (const path of userErrorsAt) {
        const errs = body.data?.[path]?.userErrors ?? [];
        if (errs.length) throw new AdminError(`${path} rejected the input`, errs);
    }
    return body.data;
}

export const money = cents => (cents / 100).toFixed(2);
