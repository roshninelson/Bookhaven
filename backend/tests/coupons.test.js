import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';

test('coupons: default seeded coupons exist and are valid', () => {
  const welcome = store.getCouponByCode('WELCOME10');
  assert.ok(welcome, 'WELCOME10 should exist');
  assert.equal(welcome.type, 'percent');
  assert.equal(welcome.value, 10);
  assert.equal(welcome.min_order, 500);

  const readmore = store.getCouponByCode('READMORE');
  assert.ok(readmore, 'READMORE should exist');
  assert.equal(readmore.type, 'percent');
  assert.equal(readmore.value, 15);
  assert.equal(readmore.min_order, 600);
});

test('coupons: create percentage and flat amount coupons', () => {
  const pCoupon = store.createCoupon({
    code: 'TESTPERC20',
    type: 'percent',
    value: 20,
    min_order: 400,
    max_discount: 150,
    max_uses: 50,
  });
  assert.ok(pCoupon.id);
  assert.equal(pCoupon.code, 'TESTPERC20');
  assert.equal(pCoupon.type, 'percent');
  assert.equal(pCoupon.value, 20);
  assert.equal(pCoupon.max_discount, 150);

  const fCoupon = store.createCoupon({
    code: 'TESTFLAT75',
    type: 'flat',
    value: 75,
    min_order: 500,
  });
  assert.ok(fCoupon.id);
  assert.equal(fCoupon.code, 'TESTFLAT75');
  assert.equal(fCoupon.type, 'flat');
  assert.equal(fCoupon.value, 75);
});

test('coupons: case-insensitive duplicate rejection', () => {
  assert.throws(
    () => {
      store.createCoupon({ code: 'welcome10', type: 'percent', value: 10 });
    },
    /already exists/i,
    'Should reject duplicate code regardless of case'
  );
});

test('coupons: reject invalid discount values and boundaries', () => {
  assert.throws(() => store.createCoupon({ code: 'BAD1', type: 'percent', value: 0 }), /positive/i);
  assert.throws(() => store.createCoupon({ code: 'BAD2', type: 'percent', value: -10 }), /positive/i);
  assert.throws(() => store.createCoupon({ code: 'BAD3', type: 'percent', value: 101 }), /exceed 100/i);
  assert.throws(() => store.createCoupon({ code: 'BAD4', type: 'flat', value: 'not-a-number' }), /positive/i);
});

test('coupons: inactive, expired, and exhausted coupons are rejected during checkout lookup', () => {
  // Inactive
  const inactive = store.createCoupon({ code: 'INACTIVE50', type: 'flat', value: 50, active: false });
  assert.equal(store.getCouponByCode('INACTIVE50'), null);

  // Expired
  const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  store.createCoupon({ code: 'EXPIRED20', type: 'percent', value: 20, expires_at: pastDate });
  assert.equal(store.getCouponByCode('EXPIRED20'), null);

  // Exhausted
  const exhausted = store.createCoupon({ code: 'EXHAUSTED1', type: 'flat', value: 10, max_uses: 1 });
  assert.ok(store.getCouponByCode('EXHAUSTED1'));
  store.useCoupon('EXHAUSTED1');
  assert.equal(store.getCouponByCode('EXHAUSTED1'), null, 'Exhausted coupon should not be retrievable');
});

test('coupons: usage increments only when used and supports update/delete', () => {
  const coupon = store.createCoupon({ code: 'UPDATEME', type: 'percent', value: 10 });
  const updated = store.updateCoupon(coupon.id, { value: 18, min_order: 600 });
  assert.equal(updated.value, 18);
  assert.equal(updated.min_order, 600);

  const deleted = store.deleteCoupon(coupon.id);
  assert.equal(deleted, true);
  assert.equal(store.getCouponByCode('UPDATEME'), null);
});
