import { randomUUID } from 'crypto';

/* ── In-memory data store for development without Supabase ──────────────
   All data resets when the server restarts.
   When SUPABASE_URL + SUPABASE_ANON_KEY are set, the books route already
   reads from Supabase. The store below handles auth, cart, wishlist,
   orders, reviews, coupons, reading-lists, and audit logs in-memory so
   the full application can run without any external service.
   ──────────────────────────────────────────────────────────────────── */

const users = [];
const carts = new Map();
const wishlists = new Map();
const orders = [];
const reviews = [];
const coupons = [
  { id: 'c1', code: 'WELCOME10', type: 'percent', value: 10, discount_percent: 10, min_order: 500, active: true, max_uses: 100, uses: 0, created_at: new Date().toISOString() },
  { id: 'c2', code: 'READMORE', type: 'percent', value: 15, discount_percent: 15, min_order: 600, active: true, max_uses: 100, uses: 0, created_at: new Date().toISOString() },
  { id: 'c3', code: 'READER20', type: 'percent', value: 20, discount_percent: 20, min_order: 1000, active: true, max_uses: 50, uses: 0, created_at: new Date().toISOString() },
  { id: 'c4', code: 'FLAT50', type: 'flat', value: 50, discount_percent: 15, min_order: 300, active: true, max_uses: 200, uses: 0, created_at: new Date().toISOString() },
];
const readingLists = new Map();
const annualGoals = new Map();
const recentlyViewed = new Map();
const auditLogs = [];

export const store = {
  /* ── Users ─────────────────────────────────────────────────────────── */
  findUserByEmail(email) {
    return users.find(u => u.email === email.toLowerCase());
  },
  findUserById(id) {
    return users.find(u => u.id === id);
  },
  createUser({ email, password_hash, display_name, role = 'customer' }) {
    const user = {
      id: randomUUID(), email: email.toLowerCase(), password_hash,
      display_name, role, created_at: new Date().toISOString(),
    };
    users.push(user);
    this.addAuditLog('user_registered', { userId: user.id, email: user.email });
    return user;
  },
  updateUser(id, updates) {
    const u = users.find(u => u.id === id);
    if (u) Object.assign(u, updates, { updated_at: new Date().toISOString() });
    return u;
  },
  getAllUsers() {
    return users.map(u => ({
      id: u.id, email: u.email, display_name: u.display_name,
      role: u.role, created_at: u.created_at,
    }));
  },
  userCount() { return users.length; },

  /* ── Cart ──────────────────────────────────────────────────────────── */
  getCart(userId) { return carts.get(userId) || []; },
  setCart(userId, items) { carts.set(userId, items); },
  addToCart(userId, bookId, qty = 1) {
    const cart = this.getCart(userId);
    const item = cart.find(i => i.bookId === bookId);
    if (item) item.qty += qty;
    else cart.push({ bookId, qty });
    this.setCart(userId, cart);
    return cart;
  },
  updateCartQty(userId, bookId, qty) {
    let cart = this.getCart(userId);
    if (qty <= 0) cart = cart.filter(i => i.bookId !== bookId);
    else {
      const item = cart.find(i => i.bookId === bookId);
      if (item) item.qty = qty;
      else cart.push({ bookId, qty });
    }
    this.setCart(userId, cart);
    return cart;
  },
  removeFromCart(userId, bookId) {
    const cart = this.getCart(userId).filter(i => i.bookId !== bookId);
    this.setCart(userId, cart);
    return cart;
  },
  clearCart(userId) { carts.delete(userId); },

  /* ── Wishlist ──────────────────────────────────────────────────────── */
  getWishlist(userId) { return [...(wishlists.get(userId) || [])]; },
  addToWishlist(userId, bookId) {
    if (!wishlists.has(userId)) wishlists.set(userId, []);
    const list = wishlists.get(userId);
    if (!list.includes(bookId)) list.push(bookId);
  },
  removeFromWishlist(userId, bookId) {
    if (!wishlists.has(userId)) return;
    wishlists.set(userId, wishlists.get(userId).filter(id => id !== bookId));
  },
  clearWishlist(userId) { wishlists.delete(userId); },
  getCoupon(code) { return this.getCouponByCode(code); },

  /* ── Orders ────────────────────────────────────────────────────────── */
  createOrder(order) {
    const o = {
      id: randomUUID(),
      status: 'placed',
      payment_status: 'test_completed',
      ...order,
      created_at: new Date().toISOString(),
    };
    orders.push(o);
    this.addAuditLog('order_created', { orderId: o.id, userId: o.user_id, total: o.total });
    return o;
  },
  getOrdersByUser(userId) {
    return orders.filter(o => o.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getOrderById(id) { return orders.find(o => o.id === id); },
  getAllOrders() {
    return [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  updateOrderStatus(id, status) {
    const o = orders.find(o => o.id === id);
    if (o) {
      o.status = status;
      o.updated_at = new Date().toISOString();
      this.addAuditLog('order_status_changed', { orderId: id, status });
    }
    return o;
  },

  /* ── Reviews ───────────────────────────────────────────────────────── */
  getReviewsByBook(bookId) {
    return reviews.filter(r => r.book_id === bookId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getReviewsByUser(userId) { return reviews.filter(r => r.user_id === userId); },
  getReviewByUserAndBook(userId, bookId) {
    return reviews.find(r => r.user_id === userId && String(r.book_id) === String(bookId));
  },
  isUserEligibleToReview(userId, bookId) {
    if (!userId || !bookId) return false;
    const userOrders = this.getOrdersByUser(userId) || [];
    const validStatuses = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
    return userOrders.some(order => {
      if (!validStatuses.includes(order.status)) return false;
      return (order.items || []).some(item =>
        String(item.bookId || item.book_id || item.id) === String(bookId)
      );
    });
  },
  addReview(review) {
    if (reviews.find(r => r.book_id === review.book_id && r.user_id === review.user_id)) {
      throw new Error('You have already reviewed this book');
    }
    const r = {
      id: randomUUID(),
      ...review,
      is_verified_purchase: true,
      status: review.status || 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    reviews.push(r);
    return r;
  },
  updateReview(id, updates) {
    const r = reviews.find(x => x.id === id);
    if (!r) return null;
    if (updates.rating !== undefined) {
      const v = Number(updates.rating);
      if (v >= 1 && v <= 5) r.rating = v;
    }
    if (updates.body !== undefined) r.body = String(updates.body).trim();
    if (updates.status !== undefined) r.status = updates.status;
    r.updated_at = new Date().toISOString();
    return r;
  },
  deleteReview(id) {
    const idx = reviews.findIndex(r => r.id === id);
    if (idx >= 0) { reviews.splice(idx, 1); return true; }
    return false;
  },
  getAllReviews() {
    return [...reviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /* ── Coupons ───────────────────────────────────────────────────────── */
  getCouponByCode(code) {
    if (!code) return null;
    const normalized = String(code).trim().toUpperCase();
    const coupon = coupons.find(c => c.code === normalized);
    if (!coupon) return null;
    if (coupon.active === false) return null;
    if (coupon.expires_at) {
      const exp = new Date(coupon.expires_at);
      if (!isNaN(exp.getTime()) && exp < new Date()) return null;
    }
    if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) return null;
    return coupon;
  },
  findCouponRaw(codeOrId) {
    const term = String(codeOrId).trim().toUpperCase();
    return coupons.find(c => c.id === codeOrId || c.code === term);
  },
  getAllCoupons() { return [...coupons]; },
  createCoupon(couponData) {
    const rawCode = couponData.code?.trim().toUpperCase();
    if (!rawCode) throw new Error('Coupon code is required');
    if (coupons.some(c => c.code === rawCode)) {
      throw new Error(`Coupon code '${rawCode}' already exists`);
    }

    const type = couponData.type || (couponData.discount_percent ? 'percent' : 'flat');
    const value = Number(couponData.value ?? couponData.discount_percent ?? 0);
    if (isNaN(value) || value <= 0) {
      throw new Error('Discount value must be a positive number');
    }
    if (type === 'percent' && value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    const min_order = Math.max(0, Number(couponData.min_order || 0));
    const max_uses = Math.max(0, Number(couponData.max_uses || 0));
    const max_discount = couponData.max_discount ? Number(couponData.max_discount) : null;
    let expires_at = null;
    if (couponData.expires_at || couponData.expiry_date) {
      const parsedDate = new Date(couponData.expires_at || couponData.expiry_date);
      if (!isNaN(parsedDate.getTime())) {
        expires_at = parsedDate.toISOString();
      }
    }

    const c = {
      id: randomUUID(),
      code: rawCode,
      type,
      value,
      discount_percent: type === 'percent' ? value : undefined,
      min_order,
      max_discount,
      max_uses,
      uses: 0,
      active: couponData.active !== false,
      expires_at,
      expiry_date: expires_at,
      created_at: new Date().toISOString(),
    };
    coupons.push(c);
    this.addAuditLog('coupon_created', { code: c.code, value, type });
    return c;
  },
  updateCoupon(id, updates) {
    const c = coupons.find(x => x.id === id);
    if (!c) return null;
    if (updates.code) {
      const newCode = updates.code.trim().toUpperCase();
      if (newCode !== c.code && coupons.some(x => x.code === newCode && x.id !== id)) {
        throw new Error(`Coupon code '${newCode}' already exists`);
      }
      c.code = newCode;
    }
    if (updates.type) c.type = updates.type;
    if (updates.value !== undefined) {
      const v = Number(updates.value);
      if (v <= 0) throw new Error('Discount value must be positive');
      if (c.type === 'percent' && v > 100) throw new Error('Percentage cannot exceed 100%');
      c.value = v;
      if (c.type === 'percent') c.discount_percent = v;
    }
    if (updates.min_order !== undefined) c.min_order = Math.max(0, Number(updates.min_order));
    if (updates.max_discount !== undefined) c.max_discount = updates.max_discount ? Number(updates.max_discount) : null;
    if (updates.max_uses !== undefined) c.max_uses = Math.max(0, Number(updates.max_uses));
    if (updates.active !== undefined) c.active = Boolean(updates.active);
    if (updates.expires_at !== undefined || updates.expiry_date !== undefined) {
      const d = updates.expires_at || updates.expiry_date;
      c.expires_at = d ? new Date(d).toISOString() : null;
      c.expiry_date = c.expires_at;
    }
    c.updated_at = new Date().toISOString();
    return c;
  },
  deleteCoupon(id) {
    const idx = coupons.findIndex(c => c.id === id);
    if (idx >= 0) {
      const removed = coupons.splice(idx, 1)[0];
      this.addAuditLog('coupon_deleted', { code: removed.code });
      return true;
    }
    return false;
  },
  useCoupon(code) {
    const c = this.getCouponByCode(code);
    if (c) c.uses += 1;
    return c;
  },

  /* ── Reading Lists ─────────────────────────────────────────────────── */
  getReadingList(userId) {
    const list = readingLists.get(userId) || [];
    return list.map(item => ({
      ...item,
      book_id: item.bookId,
    }));
  },
  addToReadingList(userId, bookId) {
    if (!readingLists.has(userId)) readingLists.set(userId, []);
    const list = readingLists.get(userId);
    const sId = String(bookId);
    if (!list.find(i => String(i.bookId) === sId)) {
      list.push({
        bookId: sId,
        book_id: sId,
        status: 'want_to_read',
        progress: 0,
        current_page: 0,
        total_pages: 320,
        added_at: new Date().toISOString(),
        completed_at: null,
      });
    }
  },
  updateReadingListItem(userId, bookId, updates) {
    const list = readingLists.get(userId) || [];
    const sId = String(bookId);
    const item = list.find(i => String(i.bookId) === sId);
    if (!item) return null;

    if (updates.status !== undefined) {
      const prevStatus = item.status;
      item.status = updates.status;
      if (['completed', 'finished'].includes(updates.status)) {
        if (!['completed', 'finished'].includes(prevStatus) || !item.completed_at) {
          item.completed_at = new Date().toISOString();
        }
      } else {
        item.completed_at = null;
      }
    }
    if (updates.progress !== undefined) item.progress = Number(updates.progress);
    if (updates.current_page !== undefined) item.current_page = Number(updates.current_page);
    if (updates.total_pages !== undefined) item.total_pages = Number(updates.total_pages);
    item.updated_at = new Date().toISOString();
    return item;
  },
  removeFromReadingList(userId, bookId) {
    if (!readingLists.has(userId)) return;
    const sId = String(bookId);
    readingLists.set(userId, readingLists.get(userId).filter(i => String(i.bookId) !== sId));
  },
  getReadingMilestone(userId, targetYear = new Date().getFullYear()) {
    const list = readingLists.get(userId) || [];
    const year = Number(targetYear);
    const completedThisYear = list.filter(item => {
      if (!['completed', 'finished'].includes(item.status)) return false;
      if (!item.completed_at) return false;
      const completedYear = new Date(item.completed_at).getFullYear();
      return completedYear === year;
    });

    const distinctBookIds = new Set(completedThisYear.map(i => String(i.bookId)));
    const completedCount = distinctBookIds.size;
    const goal = annualGoals.get(`${userId}:${year}`) || 24;
    const percent = Math.min(100, Math.round((completedCount / goal) * 100));

    return {
      year,
      completed: completedCount,
      goal,
      percent,
      isGoalReached: completedCount >= goal,
    };
  },
  setReadingGoal(userId, targetYear, goal) {
    const year = Number(targetYear) || new Date().getFullYear();
    const g = Math.max(1, Math.min(1000, Number(goal) || 24));
    annualGoals.set(`${userId}:${year}`, g);
    return this.getReadingMilestone(userId, year);
  },

  /* ── Recently Viewed ───────────────────────────────────────────────── */
  addRecentlyViewed(userId, bookId) {
    if (!recentlyViewed.has(userId)) recentlyViewed.set(userId, []);
    const list = recentlyViewed.get(userId);
    const idx = list.indexOf(bookId);
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(bookId);
    if (list.length > 10) list.pop();
  },
  getRecentlyViewed(userId) { return recentlyViewed.get(userId) || []; },

  /* ── Audit Logs ────────────────────────────────────────────────────── */
  addAuditLog(action, details = {}) {
    auditLogs.push({ id: randomUUID(), action, details, timestamp: new Date().toISOString() });
    if (auditLogs.length > 500) auditLogs.shift();
  },
  getAuditLogs(limit = 50) {
    return auditLogs.slice(-limit).reverse();
  },

  /* ── Stats ─────────────────────────────────────────────────────────── */
  getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
    return {
      totalUsers: users.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
      totalReviews: reviews.length,
      ordersThisMonth: recentOrders.length,
      revenueThisMonth: recentOrders.reduce((s, o) => s + (o.total || 0), 0),
      recentOrders: orders.slice(-10).reverse(),
      ordersByStatus: orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {}),
    };
  },
};
