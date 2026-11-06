// ShopCart backend (Cloud Functions for Firebase, 2nd gen, Node 22).
//
//  placeOrder     – callable: builds the order from the user's cart on the
//                   server (prices/stock are never trusted from the client)
//                   and starts a Paynow web or EcoCash/OneMoney payment.
//  checkPayment   – callable: polls Paynow for an order's payment status.
//  paynowResult   – HTTPS: Paynow's server-to-server result URL.
//  onOrderStatus  – pushes an FCM notification when an order's status changes.
//  onReviewWrite  – keeps product_rating / product_review_count up to date.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import {
  initiatePayment,
  pollPayment,
  verifyHash,
  classifyStatus,
  MOBILE_METHODS,
} from './paynow.js';

initializeApp();
const db = getFirestore();

const PAYNOW_INTEGRATION_ID = defineSecret('PAYNOW_INTEGRATION_ID');
const PAYNOW_INTEGRATION_KEY = defineSecret('PAYNOW_INTEGRATION_KEY');
// URL Paynow sends the customer back to after web checkout.
const PAYNOW_RETURN_URL = defineString('PAYNOW_RETURN_URL', {
  default: 'https://shopcart-6fc67.web.app/payment-complete',
});
// Public URL of the paynowResult function (shown after the first deploy).
const PAYNOW_RESULT_URL = defineString('PAYNOW_RESULT_URL');
// In Paynow TEST mode, authemail must be the merchant account's email.
// Leave empty in live mode to use the customer's own email.
const PAYNOW_TEST_EMAIL = defineString('PAYNOW_TEST_EMAIL', { default: '' });

const paynowSecrets = [PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY];
const ZW_MOBILE = /^07[1-8]\d{7}$/;

// ---------------------------------------------------------------------------
// placeOrder
// ---------------------------------------------------------------------------
export const placeOrder = onCall({ secrets: paynowSecrets }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to check out.');

  const method = String(request.data?.method || 'web');
  const phone = String(request.data?.phone || '').replace(/\s+/g, '');
  const address = String(request.data?.address || '').trim();
  if (!['web', ...MOBILE_METHODS].includes(method)) {
    throw new HttpsError('invalid-argument', 'Unknown payment method.');
  }
  if (method !== 'web' && !ZW_MOBILE.test(phone)) {
    throw new HttpsError('invalid-argument', 'Enter a valid mobile number, e.g. 0771234567.');
  }

  const cartSnap = await db.collection('carts').doc(uid).collection('products').get();
  if (cartSnap.empty) throw new HttpsError('failed-precondition', 'Your cart is empty.');

  const items = [];
  let amount = 0;
  let quantity = 0;
  for (const cartDoc of cartSnap.docs) {
    const qty = Math.max(1, Math.floor(Number(cartDoc.get('number')) || 1));
    const productSnap = await db.collection('products').doc(cartDoc.id).get();
    if (!productSnap.exists || productSnap.get('product_status') === false) {
      throw new HttpsError('failed-precondition', 'An item in your cart is no longer available.');
    }
    const p = productSnap.data();
    const stock = Number(p.product_quantity ?? 0);
    if (stock < qty) {
      throw new HttpsError(
        'failed-precondition',
        `Only ${stock} of "${p.product_name}" left in stock.`,
      );
    }
    const price = Number(p.product_price) || 0;
    items.push({
      product_id: cartDoc.id,
      product_name: p.product_name || '',
      product_thumb_image: p.product_thumb_image || p.product_image || '',
      product_price: price,
      number: qty,
      total_price: round2(price * qty),
    });
    amount += price * qty;
    quantity += qty;
  }
  amount = round2(amount);

  const userSnap = await db.collection('users').doc(uid).get();
  const user = userSnap.data() || {};
  const email = request.auth.token.email || '';

  const orderRef = db.collection('orders').doc();
  await orderRef.set({
    id: orderRef.id,
    user_id: uid,
    user_name: [user.name, user.surname].filter(Boolean).join(' '),
    delivery_address: address || user.address || '',
    items,
    amount,
    quantity,
    status: 'pending_payment',
    placed_at: Date.now(),
    payment: { provider: 'paynow', method, status: 'Created' },
  });

  try {
    const result = await initiatePayment({
      integrationId: PAYNOW_INTEGRATION_ID.value(),
      integrationKey: PAYNOW_INTEGRATION_KEY.value(),
      reference: orderRef.id,
      amount,
      description: `ShopCart order ${orderRef.id} (${quantity} items)`,
      authEmail: PAYNOW_TEST_EMAIL.value() || email,
      returnUrl: `${PAYNOW_RETURN_URL.value()}?order=${orderRef.id}`,
      resultUrl: PAYNOW_RESULT_URL.value(),
      ...(method !== 'web' ? { phone, method } : {}),
    });

    // Poll URL is kept server-side only (rules deny client access).
    await db.collection('paymentSessions').doc(orderRef.id).set({
      uid,
      pollUrl: result.pollUrl,
      created_at: FieldValue.serverTimestamp(),
    });
    await orderRef.update({
      'payment.status': 'Sent',
      'payment.paynow_reference': result.paynowReference || null,
    });

    return {
      orderId: orderRef.id,
      amount,
      redirectUrl: result.redirectUrl || null,
      instructions: result.instructions || null,
    };
  } catch (err) {
    logger.error('Paynow initiate failed', { orderId: orderRef.id, err: String(err) });
    await orderRef.update({ status: 'payment_failed', 'payment.status': 'Error' });
    throw new HttpsError('unavailable', `Payment could not be started: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// checkPayment
// ---------------------------------------------------------------------------
export const checkPayment = onCall({ secrets: paynowSecrets }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const orderId = String(request.data?.orderId || '');
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required.');

  const orderSnap = await db.collection('orders').doc(orderId).get();
  if (!orderSnap.exists || orderSnap.get('user_id') !== uid) {
    throw new HttpsError('not-found', 'Order not found.');
  }
  if (orderSnap.get('status') !== 'pending_payment') {
    return { status: orderSnap.get('status') };
  }

  const session = await db.collection('paymentSessions').doc(orderId).get();
  if (!session.exists) throw new HttpsError('failed-precondition', 'No payment in progress.');

  const poll = await pollPayment(session.get('pollUrl'), PAYNOW_INTEGRATION_KEY.value());
  const status = await applyPaymentStatus(orderId, poll.status, poll.paynowReference);
  return { status, paynowStatus: poll.status };
});

// ---------------------------------------------------------------------------
// paynowResult — Paynow POSTs urlencoded status updates here.
// ---------------------------------------------------------------------------
export const paynowResult = onRequest({ secrets: paynowSecrets }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  const fields = typeof req.body === 'object' && req.body ? req.body : {};
  if (!verifyHash(fields, PAYNOW_INTEGRATION_KEY.value())) {
    logger.warn('Rejected Paynow result with bad hash', { reference: fields.reference });
    res.status(400).send('Invalid hash');
    return;
  }
  try {
    await applyPaymentStatus(String(fields.reference), String(fields.status), fields.paynowreference);
    res.status(200).send('OK');
  } catch (err) {
    logger.error('Failed to apply Paynow result', { err: String(err) });
    res.status(500).send('Error');
  }
});

/**
 * Moves an order out of pending_payment. Idempotent: safe to call from both
 * the result URL and client polling.
 * @returns {Promise<string>} the order's resulting status
 */
async function applyPaymentStatus(orderId, paynowStatus, paynowReference) {
  const outcome = classifyStatus(paynowStatus);
  const orderRef = db.collection('orders').doc(orderId);

  if (outcome === 'pending') {
    await orderRef.update({ 'payment.status': paynowStatus }).catch(() => {});
    return 'pending_payment';
  }

  const finalStatus = await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error(`Order ${orderId} not found`);
    const order = orderSnap.data();
    if (order.status !== 'pending_payment') return order.status;

    if (outcome === 'failed') {
      tx.update(orderRef, { status: 'payment_failed', 'payment.status': paynowStatus });
      return 'payment_failed';
    }

    // Paid: decrement stock. All reads must happen before writes.
    const productRefs = order.items.map((i) => db.collection('products').doc(i.product_id));
    const productSnaps = await Promise.all(productRefs.map((r) => tx.get(r)));
    productSnaps.forEach((snap, idx) => {
      if (!snap.exists) return;
      const left = Math.max(0, Number(snap.get('product_quantity') || 0) - order.items[idx].number);
      tx.update(productRefs[idx], { product_quantity: left });
    });
    tx.update(orderRef, {
      status: 'new',
      paid_at: Date.now(),
      'payment.status': paynowStatus,
      'payment.paynow_reference': paynowReference || order.payment?.paynow_reference || null,
    });
    // Legacy payments history used by the old app.
    tx.set(db.collection('users').doc(order.user_id).collection('payments').doc(orderId), {
      order_id: orderId,
      price: order.amount,
      method: order.payment?.method || 'web',
      provider: 'paynow',
      paynow_reference: paynowReference || null,
      time: Date.now(),
    });
    return 'new';
  });

  if (finalStatus === 'new') {
    // Clear purchased items from the cart.
    const order = (await orderRef.get()).data();
    const batch = db.batch();
    for (const item of order.items) {
      batch.delete(db.collection('carts').doc(order.user_id).collection('products').doc(item.product_id));
    }
    batch.delete(db.collection('paymentSessions').doc(orderId));
    await batch.commit();
  }
  return finalStatus;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const STATUS_MESSAGES = {
  new: 'Payment received. We are preparing your order.',
  shipped: 'Your order is on its way.',
  delivered: 'Your order has been delivered. Enjoy!',
  cancelled: 'Your order was cancelled.',
  payment_failed: 'Your payment did not go through. Please try again.',
};

export const onOrderStatus = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status) return;

  // Return stock when a paid order is cancelled. (Refunds are issued
  // manually from the Paynow merchant dashboard.)
  if (after.status === 'cancelled' && ['new', 'shipped'].includes(before.status) && Array.isArray(after.items)) {
    const batch = db.batch();
    for (const item of after.items) {
      batch.update(db.collection('products').doc(item.product_id), {
        product_quantity: FieldValue.increment(item.number),
      });
    }
    await batch.commit().catch((err) => logger.warn('Stock restore failed', { err: String(err) }));
  }

  const body = STATUS_MESSAGES[after.status];
  if (!body) return;

  const user = await db.collection('users').doc(after.user_id).get();
  const token = user.get('deviceToken');
  if (!token) return;
  try {
    await getMessaging().send({
      token,
      notification: { title: 'ShopCart order update', body },
      data: { orderId: event.params.orderId, status: String(after.status) },
      android: { notification: { channelId: 'orders' } },
    });
  } catch (err) {
    logger.warn('FCM send failed', { err: String(err) });
  }
});

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------
export const onReviewWrite = onDocumentWritten('reviews/{reviewId}', async (event) => {
  const data = event.data?.after.data() || event.data?.before.data();
  const productId = data?.prodId;
  if (!productId) return;
  const reviews = await db.collection('reviews').where('prodId', '==', productId).get();
  const ratings = reviews.docs.map((d) => Number(d.get('rating')) || 0).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  await db.collection('products').doc(productId).set(
    { product_rating: round2(avg), product_review_count: ratings.length },
    { merge: true },
  );
});

function round2(n) {
  return Math.round(n * 100) / 100;
}
