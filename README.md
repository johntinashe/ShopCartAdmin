# ShopCart Admin + Backend (v2)

Admin dashboard and Firebase backend for **ShopCart**, an e‑commerce app for
Zimbabwe with Paynow, EcoCash and OneMoney payments. Originally built in 2018
as a final‑year project (Angular 5 + jQuery theme); rebuilt in 2026.

The Android app lives in [ShopCartAndroid](https://github.com/johntinashe/ShopCartAndroid).

## What's here

| Path | What |
| --- | --- |
| `src/` | Angular 21 admin dashboard (standalone components, signals, zoneless, Angular Material) |
| `firebase/functions/` | Cloud Functions (Node 22): checkout, Paynow integration, notifications |
| `firebase/firestore.rules` | Firestore security rules |
| `firebase/storage.rules` | Storage rules for product/category/profile images |
| `firebase/firestore.indexes.json` | Composite indexes the apps need |

### Dashboard
- **Dashboard** – revenue, orders to fulfil, product and customer counts, recent orders, low stock, latest reviews
- **Orders** – filter by status, search, order detail with items, payment and timeline; mark shipped / delivered / cancelled (customer gets a push notification)
- **Products** – search, filter by category, show/hide toggle, create/edit with image upload
- **Categories** – create/edit with image, product counts
- **Customers** – searchable list, profile with order history and total spent
- **Messages** – live support chat with customers, unread counts

### Backend (Cloud Functions)
- `placeOrder` – builds the order **on the server** from the customer's cart (prices and stock are never trusted from the phone) and starts a Paynow payment: EcoCash / OneMoney express checkout (customer approves on their phone) or Paynow web checkout
- `checkPayment` – polls Paynow for an order's status
- `paynowResult` – Paynow's result URL; verifies the hash and confirms the order
- `onOrderStatus` – push notification to the customer when status changes; restores stock if a paid order is cancelled
- `onReviewWrite` – keeps each product's average rating up to date

Payment confirmation is idempotent: whichever arrives first (result URL or poll) marks the order paid, decrements stock and clears the cart exactly once.

## Order statuses

`pending_payment` → `new` (paid) → `shipped` → `delivered`, or `payment_failed` / `cancelled`.
Orders from the 2018 app still display (their items are read from the old sub‑collection).

## Setup

Requirements: Node 22+, the Firebase CLI (`npm i -g firebase-tools`), and the
Firebase project on the **Blaze** plan (Cloud Functions require it).

```bash
npm install
cd firebase/functions && npm install && npm test && cd ../..
firebase login
```

### 1. Paynow credentials
From the Paynow merchant dashboard, create an integration and copy its ID and key.
Store them as secrets (never commit them):

```bash
firebase functions:secrets:set PAYNOW_INTEGRATION_ID
firebase functions:secrets:set PAYNOW_INTEGRATION_KEY
```

While the integration is in **test mode**, Paynow only accepts payments where the
`authemail` is your merchant account email. Set it so test payments work:

```bash
# firebase/functions/.env  (not committed)
PAYNOW_TEST_EMAIL=you@yourbusiness.co.zw
```

Remove it once Paynow switches your integration to live.

### 2. Deploy rules, indexes and functions
```bash
firebase deploy --only firestore,storage,functions
```

The deploy prints the URL of `paynowResult`. Add it to `firebase/functions/.env`
and deploy functions again:

```bash
PAYNOW_RESULT_URL=https://paynowresult-xxxxx-uc.a.run.app
```

Optionally set `PAYNOW_RETURN_URL` (where web‑checkout customers land after paying).

### 3. Create an admin
Admins are users with a document in the `admins` collection:
1. Firebase console → Authentication → add a user (email + password).
2. Firestore → `admins` → add a document whose ID is that user's UID, e.g. `{ "name": "JT", "role": "owner" }`.

### 4. Run / deploy the dashboard
```bash
npm start                 # http://localhost:4200
npm run deploy            # builds and deploys to Firebase Hosting
```

## Security notes
- The Firebase web `apiKey` in `src/environments/environment.ts` is a public identifier, not a secret; access is enforced by the security rules.
- The 2018 app had a Stripe secret key in the Android source. It is gone from this version, but it remains in the git history: **roll that key in the Stripe dashboard**.
- Refunds for cancelled paid orders are issued manually from the Paynow dashboard.

## Tech
Angular 21 · @angular/fire 21 · Firebase JS SDK 12 · Angular Material · Cloud Functions 2nd gen (Node 22) · Paynow HTTP API
