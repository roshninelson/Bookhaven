import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store.js';

test('store: cart add, update qty, and remove', () => {
  const userId = 'test-user-cart-1';
  store.clearCart(userId);

  store.addToCart(userId, 'b1', 2);
  let cart = store.getCart(userId);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 2);

  store.updateCartQty(userId, 'b1', 4);
  cart = store.getCart(userId);
  assert.equal(cart[0].qty, 4);

  store.removeFromCart(userId, 'b1');
  cart = store.getCart(userId);
  assert.equal(cart.length, 0);
});

test('store: wishlist toggle and clear', () => {
  const userId = 'test-user-wish-1';
  store.clearWishlist(userId);

  store.addToWishlist(userId, 'b1');
  store.addToWishlist(userId, 'b2');
  let wish = store.getWishlist(userId);
  assert.equal(wish.length, 2);

  store.removeFromWishlist(userId, 'b1');
  wish = store.getWishlist(userId);
  assert.equal(wish.length, 1);
  assert.equal(wish[0], 'b2');
});

test('store: coupon lookup and discount validation', () => {
  const coupon = store.getCoupon('WELCOME10');
  assert.ok(coupon);
  assert.equal(coupon.discount_percent, 10);
});

test('store: order creation and retrieval', () => {
  const order = store.createOrder({
    user_id: 'test-user-order-1',
    items: [{ bookId: 'b1', title: 'Atomic Habits', price: 399, qty: 1 }],
    subtotal: 399,
    discount: 0,
    shipping_fee: 60,
    total: 459,
    status: 'placed',
  });

  assert.ok(order.id);
  assert.equal(order.total, 459);

  const userOrders = store.getOrdersByUser('test-user-order-1');
  assert.ok(userOrders.some((o) => o.id === order.id));
});
