import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { store } from '../lib/store.js';
import { demoBooks, listBooks } from '../lib/books.js';

const router = Router();
router.use(authenticate, requireAdmin);

/* ── Dashboard Stats ────────────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
  try {
    const stats = await store.getStats();
    const allBooks = await listBooks();
    const lowStock = allBooks.filter(b => b.stock <= 5);
    res.json({ data: { ...stats, totalBooks: allBooks.length, lowStockBooks: lowStock } });
  } catch (err) {
    res.status(500).json({ error: 'Could not load stats' });
  }
});

/* ── Book Management ────────────────────────────────────────────────── */
router.get('/books', async (req, res) => {
  try {
    // Admin sees ALL books including inactive
    const allBooks = await listBooks();
    res.json({ data: allBooks });
  } catch (err) {
    res.status(500).json({ error: 'Could not load books' });
  }
});

router.post('/books', (req, res) => {
  const { title, author, category, price, old_price, description, stock, cover_url, featured } = req.body || {};
  if (!title || !author || !category || !price) {
    return res.status(400).json({ error: 'title, author, category, and price are required' });
  }
  if (Number(price) <= 0) return res.status(400).json({ error: 'Price must be positive' });

  const id = 'b' + Date.now();
  const book = {
    id, title: title.trim(), author: author.trim(), category: category.trim(),
    price: Number(price), old_price: old_price ? Number(old_price) : null,
    rating: 0, review_count: 0, description: description?.trim() || '',
    stock: Math.max(0, Number(stock) || 0),
    cover_url: cover_url || `https://placehold.co/400x600/F2EFE6/263D32?text=${encodeURIComponent(title)}`,
    featured: Boolean(featured), is_active: true,
    created_at: new Date().toISOString(),
  };

  demoBooks.push(book);
  store.addAuditLog('book_created', { bookId: id, title, admin: req.user.email });
  res.status(201).json({ data: book });
});

router.put('/books/:id', async (req, res) => {
  const allBooks = await listBooks();
  const book = allBooks.find(b => String(b.id) === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const updates = req.body || {};
  const allowed = ['title', 'author', 'category', 'price', 'old_price', 'description', 'stock', 'cover_url', 'featured', 'is_active'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'price' || key === 'old_price' || key === 'stock') {
        book[key] = Math.max(0, Number(updates[key]) || 0);
      } else if (key === 'featured' || key === 'is_active') {
        book[key] = Boolean(updates[key]);
      } else {
        book[key] = String(updates[key]).trim();
      }
    }
  }
  book.updated_at = new Date().toISOString();
  store.addAuditLog('book_updated', { bookId: req.params.id, admin: req.user.email });
  res.json({ data: book });
});

router.delete('/books/:id', async (req, res) => {
  const allBooks = await listBooks();
  const book = allBooks.find(b => String(b.id) === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  book.is_active = false;
  store.addAuditLog('book_deactivated', { bookId: req.params.id, admin: req.user.email });
  res.json({ ok: true, message: 'Book deactivated' });
});

/* ── Order Management ───────────────────────────────────────────────── */
router.get('/orders', (req, res) => {
  const orders = store.getAllOrders();
  res.json({ data: orders });
});

export const VALID_ORDER_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
  'refunded',
];

router.put('/orders/:id', (req, res) => {
  const { status } = req.body || {};
  const normalizedStatus = status?.trim()?.toLowerCase();
  if (!VALID_ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_ORDER_STATUSES.join(', ')}` });
  }
  const order = store.updateOrderStatus(req.params.id, normalizedStatus);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ data: order, message: `Order status updated to ${normalizedStatus}` });
});

/* ── User Management ────────────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  const users = await store.getAllUsers();
  res.json({ data: users });
});

/* ── Review Moderation ──────────────────────────────────────────────── */
router.get('/reviews', (req, res) => {
  res.json({ data: store.getAllReviews() });
});

router.delete('/reviews/:id', (req, res) => {
  const deleted = store.deleteReview(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Review not found' });
  store.addAuditLog('review_deleted_by_admin', { reviewId: req.params.id, admin: req.user.email });
  res.json({ ok: true });
});

/* ── Coupon Management ──────────────────────────────────────────────── */
router.get('/coupons', (req, res) => {
  res.json({ data: store.getAllCoupons() });
});

router.post('/coupons', (req, res) => {
  try {
    const { code, type, value, discount_percent, min_order, max_discount, max_uses, expires_at, expiry_date, active } = req.body || {};
    const rawCode = (code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const resolvedType = type || (discount_percent !== undefined ? 'percent' : 'flat');
    if (!['percent', 'flat'].includes(resolvedType)) {
      return res.status(400).json({ error: 'Discount type must be percent or flat' });
    }

    const resolvedValue = Number(value !== undefined ? value : discount_percent);
    if (isNaN(resolvedValue) || resolvedValue <= 0) {
      return res.status(400).json({ error: 'Discount value must be a positive number' });
    }
    if (resolvedType === 'percent' && resolvedValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    const coupon = store.createCoupon({
      code: rawCode,
      type: resolvedType,
      value: resolvedValue,
      min_order: min_order !== undefined ? Number(min_order) : 0,
      max_discount: max_discount ? Number(max_discount) : null,
      max_uses: max_uses !== undefined ? Number(max_uses) : 0,
      expires_at: expires_at || expiry_date || null,
      active: active !== false,
    });

    store.addAuditLog('coupon_created', { code: coupon.code, admin: req.user.email });
    res.status(201).json({ data: coupon });
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || 'Failed to create coupon' });
  }
});

router.put('/coupons/:id', (req, res) => {
  try {
    const coupon = store.updateCoupon(req.params.id, req.body);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    store.addAuditLog('coupon_updated', { id: req.params.id, admin: req.user.email });
    res.json({ data: coupon });
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || 'Failed to update coupon' });
  }
});

router.patch('/coupons/:id/toggle', (req, res) => {
  const coupon = store.getAllCoupons().find(c => c.id === req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  coupon.active = !coupon.active;
  coupon.updated_at = new Date().toISOString();
  store.addAuditLog('coupon_toggled', { id: coupon.id, code: coupon.code, active: coupon.active, admin: req.user.email });
  res.json({ data: coupon });
});

router.delete('/coupons/:id', (req, res) => {
  const deleted = store.deleteCoupon(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Coupon not found' });
  store.addAuditLog('coupon_deleted', { id: req.params.id, admin: req.user.email });
  res.json({ ok: true, message: 'Coupon deleted successfully' });
});

/* ── Audit Log ──────────────────────────────────────────────────────── */
router.get('/audit', (req, res) => {
  res.json({ data: store.getAuditLogs(100) });
});

export default router;
