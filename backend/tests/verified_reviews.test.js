import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';

test('reviews: non-buyer is rejected from review eligibility', () => {
  const buyerId = 'test-buyer-101';
  const nonBuyerId = 'test-non-buyer-202';

  // Buyer orders book 'b9' (The Hobbit)
  store.createOrder({
    user_id: buyerId,
    status: 'placed',
    items: [{ bookId: 'b9', title_snapshot: 'The Hobbit', unit_price: 399, qty: 1 }],
    total: 399,
  });

  // Check buyer eligibility for b9
  const buyerEligible = store.isUserEligibleToReview(buyerId, 'b9');
  assert.equal(buyerEligible, true, 'Legitimate buyer should be eligible');

  // Check non-buyer eligibility for b9
  const nonBuyerEligible = store.isUserEligibleToReview(nonBuyerId, 'b9');
  assert.equal(nonBuyerEligible, false, 'Non-buyer must not be eligible');
});

test('reviews: purchasing one book does not unlock reviews for another book', () => {
  const buyerId = 'test-buyer-single-book';

  // Buyer purchases b10 (Project Hail Mary) only
  store.createOrder({
    user_id: buyerId,
    status: 'delivered',
    items: [{ bookId: 'b10', title_snapshot: 'Project Hail Mary', unit_price: 499, qty: 1 }],
    total: 499,
  });

  assert.equal(store.isUserEligibleToReview(buyerId, 'b10'), true, 'Should be eligible for purchased b10');
  assert.equal(store.isUserEligibleToReview(buyerId, 'b11'), false, 'Must NOT be eligible for unpurchased b11');
});

test('reviews: cancelled, failed, and refunded orders do not grant review eligibility', () => {
  const cancelledUserId = 'user-cancelled-order';
  const refundedUserId = 'user-refunded-order';
  const failedUserId = 'user-failed-order';

  store.createOrder({
    user_id: cancelledUserId,
    status: 'cancelled',
    items: [{ bookId: 'b12', title_snapshot: 'The Silent Patient', unit_price: 350, qty: 1 }],
    total: 350,
  });

  store.createOrder({
    user_id: refundedUserId,
    status: 'refunded',
    items: [{ bookId: 'b12', title_snapshot: 'The Silent Patient', unit_price: 350, qty: 1 }],
    total: 350,
  });

  store.createOrder({
    user_id: failedUserId,
    status: 'failed',
    items: [{ bookId: 'b12', title_snapshot: 'The Silent Patient', unit_price: 350, qty: 1 }],
    total: 350,
  });

  assert.equal(store.isUserEligibleToReview(cancelledUserId, 'b12'), false, 'Cancelled order must not qualify');
  assert.equal(store.isUserEligibleToReview(refundedUserId, 'b12'), false, 'Refunded order must not qualify');
  assert.equal(store.isUserEligibleToReview(failedUserId, 'b12'), false, 'Failed order must not qualify');
});

test('reviews: review creation, duplicate prevention, and explicit edit flow', () => {
  const userId = 'review-edit-user-1';
  const bookId = 'b13';

  // Order book b13
  store.createOrder({
    user_id: userId,
    status: 'delivered',
    items: [{ bookId, title_snapshot: 'The Love Hypothesis', unit_price: 320, qty: 1 }],
    total: 320,
  });

  // Post review
  const rev = store.addReview({
    book_id: bookId,
    user_id: userId,
    rating: 5,
    body: 'Captivating romantic read with witty dialogue.',
  });
  assert.ok(rev.id);
  assert.equal(rev.is_verified_purchase, true);

  // Attempt duplicate review should throw
  assert.throws(
    () => store.addReview({ book_id: bookId, user_id: userId, rating: 4, body: 'Duplicate' }),
    /already reviewed/i
  );

  // Edit existing review
  const updated = store.updateReview(rev.id, { rating: 4, body: 'Updated reflection: 4 stars.' });
  assert.equal(updated.rating, 4);
  assert.equal(updated.body, 'Updated reflection: 4 stars.');

  const fetched = store.getReviewByUserAndBook(userId, bookId);
  assert.equal(fetched.rating, 4);
});
