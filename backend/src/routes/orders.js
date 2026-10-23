import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { store } from '../lib/store.js';
import { listBooks } from '../lib/books.js';

const router = Router();
const ORDER_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

/* POST /api/orders – create order (checkout) */
router.post('/', authenticate, async (req, res) => {
  try {
    const body = req.body || {};
    const items = body.items;
    const shipping_address = body.shipping_address || body.shippingAddress;
    const coupon_code = body.coupon_code || body.couponCode;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }
    if (!shipping_address || !shipping_address.name || !shipping_address.address) {
      return res.status(400).json({ error: 'Shipping address with name and address is required' });
    }

    /* Validate every item against current catalogue prices and stock */
    const allBooks = await listBooks();
    const validatedItems = [];
    for (const item of items) {
      const book = allBooks.find(b => String(b.id) === String(item.bookId));
      if (!book) return res.status(400).json({ error: `Book ${item.bookId} not found` });
      if (book.stock < (item.qty || 1)) {
        return res.status(400).json({ error: `${book.title} only has ${book.stock} in stock` });
      }
      validatedItems.push({
        bookId: String(book.id),
        title_snapshot: book.title,
        author_snapshot: book.author,
        unit_price: book.price,  // server-side authoritative price
        qty: Math.max(1, Math.min(Number(item.qty) || 1, book.stock)),
        cover_url: book.cover_url,
      });
    }

    let subtotal = validatedItems.reduce((s, i) => s + i.unit_price * i.qty, 0);
    let discount = 0;
    let appliedCoupon = null;

    /* Apply coupon if provided */
    if (coupon_code) {
      appliedCoupon = store.getCouponByCode(coupon_code);
      if (!appliedCoupon) {
        const raw = store.findCouponRaw?.(coupon_code);
        if (!raw) return res.status(400).json({ error: 'Invalid coupon code' });
        if (!raw.active) return res.status(400).json({ error: 'This coupon is currently inactive' });
        if (raw.expires_at && new Date(raw.expires_at) < new Date()) {
          return res.status(400).json({ error: 'This coupon has expired' });
        }
        if (raw.max_uses > 0 && raw.uses >= raw.max_uses) {
          return res.status(400).json({ error: 'This coupon has reached its maximum usage limit' });
        }
        return res.status(400).json({ error: 'Invalid or expired coupon code' });
      }

      if (subtotal < (appliedCoupon.min_order || 0)) {
        return res.status(400).json({ error: `Minimum order of ₹${appliedCoupon.min_order} required for coupon '${appliedCoupon.code}'` });
      }

      if (appliedCoupon.type === 'percent') {
        discount = Math.round((subtotal * appliedCoupon.value) / 100);
      } else {
        discount = appliedCoupon.value;
      }

      if (appliedCoupon.max_discount && appliedCoupon.max_discount > 0) {
        discount = Math.min(discount, appliedCoupon.max_discount);
      }
      discount = Math.min(discount, subtotal);
    }

    const shipping = subtotal - discount >= 799 ? 0 : 49;
    const total = Math.max(0, subtotal - discount + shipping);

    const order = store.createOrder({
      user_id: req.user.id,
      items: validatedItems,
      subtotal,
      discount,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      shipping,
      total,
      shipping_address,
    });

    /* Increment coupon usage only after successful order creation */
    if (appliedCoupon) {
      store.useCoupon(appliedCoupon.code);
    }

    /* Add purchased books to user's library/bookshelf without marking completed */
    for (const item of validatedItems) {
      store.addToReadingList(req.user.id, item.bookId);
    }

    /* Clear user's cart after successful order */
    store.clearCart(req.user.id);

    res.status(201).json({
      data: order,
      message: 'Order placed successfully! This is a DEMO checkout — no real payment was processed.',
    });
  } catch (err) {
    console.error('Order error:', err.message);
    res.status(500).json({ error: 'Could not create order' });
  }
});

/* POST /api/orders/validate-coupon – real-time check before checkout */
router.post('/validate-coupon', authenticate, (req, res) => {
  const { code, subtotal = 0 } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Coupon code is required' });

  const raw = store.findCouponRaw?.(code);
  if (!raw) return res.status(404).json({ error: 'Coupon code does not exist' });
  if (!raw.active) return res.status(400).json({ error: 'This coupon is currently deactivated' });
  if (raw.expires_at && new Date(raw.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired' });
  }
  if (raw.max_uses > 0 && raw.uses >= raw.max_uses) {
    return res.status(400).json({ error: 'This coupon has reached its maximum usage limit' });
  }

  const numSubtotal = Number(subtotal);
  if (numSubtotal < (raw.min_order || 0)) {
    return res.status(400).json({
      error: `Minimum order value of ₹${raw.min_order} required (current: ₹${numSubtotal})`,
    });
  }

  let discount = 0;
  if (raw.type === 'percent') {
    discount = Math.round((numSubtotal * raw.value) / 100);
  } else {
    discount = raw.value;
  }
  if (raw.max_discount && raw.max_discount > 0) {
    discount = Math.min(discount, raw.max_discount);
  }
  discount = Math.min(discount, numSubtotal);

  res.json({
    data: {
      code: raw.code,
      type: raw.type,
      value: raw.value,
      discount,
      min_order: raw.min_order,
      max_discount: raw.max_discount,
      description: raw.type === 'percent' ? `${raw.value}% off` : `₹${raw.value} off`,
    },
  });
});

/* GET /api/orders – user's order history */
router.get('/', authenticate, (req, res) => {
  res.json({ data: store.getOrdersByUser(req.user.id) });
});

/* GET /api/orders/:id */
router.get('/:id', authenticate, (req, res) => {
  const order = store.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json({ data: order });
});

export default router;
