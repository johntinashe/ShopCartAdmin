// Minimal Paynow (Zimbabwe) client: web checkout + mobile express checkout
// (EcoCash / OneMoney). Implements the Paynow HTTP protocol directly so there
// is no third-party SDK to keep up to date.
// Protocol: https://developers.paynow.co.zw/docs/
import crypto from 'node:crypto';

const INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';
const MOBILE_URL = 'https://www.paynow.co.zw/interface/remotetransaction';

export const PAID_STATUSES = ['paid', 'awaiting delivery', 'delivered'];
export const FAILED_STATUSES = ['cancelled', 'failed', 'disputed', 'refunded'];
export const MOBILE_METHODS = ['ecocash', 'onemoney'];

/**
 * Paynow hash: concatenate every field value (in order, excluding `hash`),
 * append the integration key, SHA512, uppercase hex.
 * @param {Record<string, unknown>} fields
 * @param {string} integrationKey
 */
export function createHash(fields, integrationKey) {
  const joined = Object.entries(fields)
    .filter(([k]) => k.toLowerCase() !== 'hash')
    .map(([, v]) => (v === undefined || v === null ? '' : String(v)))
    .join('');
  return crypto
    .createHash('sha512')
    .update(joined + integrationKey, 'utf8')
    .digest('hex')
    .toUpperCase();
}

/** @param {Record<string, string>} fields @param {string} integrationKey */
export function verifyHash(fields, integrationKey) {
  if (!fields || typeof fields.hash !== 'string') return false;
  const expected = createHash(fields, integrationKey);
  const actual = fields.hash.toUpperCase();
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  );
}

/** @param {string} text */
export function parseResponse(text) {
  return Object.fromEntries(new URLSearchParams(text.trim()));
}

/** @param {string} url @param {Record<string, string>} fields */
async function post(url, fields) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
  if (!res.ok) throw new Error(`Paynow HTTP ${res.status}`);
  return parseResponse(await res.text());
}

/**
 * Start a payment. Pass `phone` + `method` for EcoCash/OneMoney express
 * checkout (customer approves on their phone); omit them for web checkout
 * (customer is sent to `redirectUrl`).
 *
 * @param {object} p
 * @param {string} p.integrationId
 * @param {string} p.integrationKey
 * @param {string} p.reference   our order id
 * @param {number} p.amount      USD
 * @param {string} p.description
 * @param {string} p.authEmail   customer email (in Paynow test mode: the merchant account email)
 * @param {string} p.returnUrl
 * @param {string} p.resultUrl
 * @param {string} [p.phone]
 * @param {'ecocash'|'onemoney'} [p.method]
 * @returns {Promise<{pollUrl: string, redirectUrl?: string, instructions?: string, paynowReference?: string}>}
 */
export async function initiatePayment(p) {
  const mobile = Boolean(p.phone && p.method);
  /** @type {Record<string, string>} */
  const fields = {
    id: p.integrationId,
    reference: p.reference,
    amount: p.amount.toFixed(2),
    additionalinfo: p.description,
    returnurl: p.returnUrl,
    resulturl: p.resultUrl,
    authemail: p.authEmail || '',
  };
  if (mobile) {
    fields.phone = p.phone;
    fields.method = p.method;
  }
  fields.status = 'Message';
  fields.hash = createHash(fields, p.integrationKey);

  const res = await post(mobile ? MOBILE_URL : INITIATE_URL, fields);
  if ((res.status || '').toLowerCase() !== 'ok') {
    throw new Error(res.error || 'Paynow rejected the payment request');
  }
  if (!verifyHash(res, p.integrationKey)) {
    throw new Error('Paynow response failed hash verification');
  }
  return {
    pollUrl: res.pollurl,
    redirectUrl: res.browserurl || undefined,
    instructions: res.instructions || undefined,
    paynowReference: res.paynowreference || undefined,
  };
}

/**
 * Ask Paynow for the current status of a transaction.
 * @param {string} pollUrl
 * @param {string} integrationKey
 * @returns {Promise<{status: string, paynowReference?: string, amount?: string, reference?: string}>}
 */
export async function pollPayment(pollUrl, integrationKey) {
  const res = await post(pollUrl, {});
  if (!verifyHash(res, integrationKey)) {
    throw new Error('Paynow poll response failed hash verification');
  }
  return {
    status: res.status || '',
    paynowReference: res.paynowreference,
    amount: res.amount,
    reference: res.reference,
  };
}

/** @param {string} status */
export function classifyStatus(status) {
  const s = (status || '').toLowerCase();
  if (PAID_STATUSES.includes(s)) return 'paid';
  if (FAILED_STATUSES.includes(s)) return 'failed';
  return 'pending';
}
