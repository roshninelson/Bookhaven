import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';
import { VALID_ORDER_STATUSES } from '../src/routes/admin.js';

test('admin orders: VALID_ORDER_STATUSES includes processing and standard lifecycle', () => {
  assert.ok(VALID_ORDER_STATUSES.includes('processing'), 'processing status must be supported');
  assert.ok(VALID_ORDER_STATUSES.includes('placed'));
  assert.ok(VALID_ORDER_STATUSES.includes('confirmed'));
  assert.ok(VALID_ORDER_STATUSES.includes('packed'));
  assert.ok(VALID_ORDER_STATUSES.includes('shipped'));
  assert.ok(VALID_ORDER_STATUSES.includes('delivered'));
  assert.ok(VALID_ORDER_STATUSES.includes('cancelled'));
  assert.ok(VALID_ORDER_STATUSES.includes('refunded'));
  assert.ok(VALID_ORDER_STATUSES.includes('failed'));
});

test('admin orders: update status to processing persists in store and logs audit', () => {
  const order = store.createOrder({
    user_id: 'test-user-proc-1',
    status: 'placed',
    items: [{ bookId: 'b1', title_snapshot: 'Atomic Habits', unit_price: 399, qty: 1 }],
    total: 399,
  });

  assert.equal(order.status, 'placed');

  // Admin updates order to processing
  const updated = store.updateOrderStatus(order.id, 'processing');
  assert.ok(updated);
  assert.equal(updated.status, 'processing');
  assert.ok(updated.updated_at);

  // Verify retrieval
  const fetched = store.getOrderById(order.id);
  assert.equal(fetched.status, 'processing');

  // Verify audit log
  const logs = store.getAuditLogs(10);
  assert.ok(logs.some(l => l.action === 'order_status_changed' && l.details.status === 'processing'));
});

test('admin orders: review eligibility remains valid for processing status', () => {
  const buyerId = 'proc-buyer-1';
  store.createOrder({
    user_id: buyerId,
    status: 'processing',
    items: [{ bookId: 'b21', title_snapshot: 'Pride and Prejudice', unit_price: 249, qty: 1 }],
    total: 249,
  });

  const eligible = store.isUserEligibleToReview(buyerId, 'b21');
  assert.equal(eligible, true, 'Orders in processing status must be eligible for verified reviews');
});
