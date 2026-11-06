import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, verifyHash, parseResponse, classifyStatus } from './paynow.js';

const KEY = '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977';

test('hash matches the example in the Paynow documentation', () => {
  const fields = {
    id: '1201',
    reference: 'TEST REF',
    amount: '99.99',
    additionalinfo: 'A test ticket transaction',
    returnurl: 'http://www.google.com/search?q=returnurl',
    resulturl: 'http://www.google.com/search?q=resulturl',
    status: 'Message',
  };
  assert.equal(
    createHash(fields, KEY),
    '2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689',
  );
});

test('verifyHash rejects tampered responses', () => {
  const res = parseResponse('status=Ok&pollurl=https%3a%2f%2fwww.paynow.co.zw%2fpoll&hash=');
  res.hash = createHash(res, KEY);
  assert.equal(verifyHash(res, KEY), true);
  assert.equal(verifyHash({ ...res, status: 'Paid' }, KEY), false);
  assert.equal(verifyHash({ status: 'Ok' }, KEY), false);
});

test('classifyStatus', () => {
  assert.equal(classifyStatus('Paid'), 'paid');
  assert.equal(classifyStatus('Awaiting Delivery'), 'paid');
  assert.equal(classifyStatus('Cancelled'), 'failed');
  assert.equal(classifyStatus('Sent'), 'pending');
});
