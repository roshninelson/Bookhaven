import { randomUUID } from 'crypto';
import { getSupabase } from './supabase.js';

/* ── Persistent & in-memory data store ──────────────────────────────────
   When SUPABASE_URL + (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) are set,
   user accounts are stored persistently in Supabase PostgreSQL (public.users)
   with read-through/write-through in-memory caching.
   If Supabase is unavailable, missing, or encounters errors, the store safely
   falls back to the in-memory cache so the bookstore remains operational.
   ──────────────────────────────────────────────────────────────────── */

let users = [];
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
  /* ── Users (Supabase PostgreSQL + In-Memory Fallback) ─────────────────── */
  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = String(email).toLowerCase().trim();

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, password_hash, display_name, role, created_at, updated_at')
          .ilike('email', normalized)
          .maybeSingle();

        if (!error && data) {
          const user = {
            id: data.id,
            email: data.email.toLowerCase(),
            password_hash: data.password_hash,
            display_name: data.display_name,
            role: data.role,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
          const idx = users.findIndex(u => u.id === user.id || u.email === user.email);
          if (idx >= 0) users[idx] = user;
          else users.push(user);
          return user;
        }
      } catch (err) {
        console.warn('[DB] Supabase findUserByEmail error:', err.message);
      }
    }
    return users.find(u => u.email === normalized) || null;
  },

  async findUserById(id) {
    if (!id) return null;
    const cached = users.find(u => u.id === id);
    if (cached) return cached;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, password_hash, display_name, role, created_at, updated_at')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const user = {
            id: data.id,
            email: data.email.toLowerCase(),
            password_hash: data.password_hash,
            display_name: data.display_name,
            role: data.role,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
          const idx = users.findIndex(u => u.id === user.id);
          if (idx >= 0) users[idx] = user;
          else users.push(user);
          return user;
        }
      } catch (err) {
        console.warn('[DB] Supabase findUserById error:', err.message);
      }
    }
    return null;
  },

  async createUser({ email, password_hash, display_name, role = 'customer' }) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const newUser = {
      id: randomUUID(),
      email: normalizedEmail,
      password_hash,
      display_name: display_name || normalizedEmail.split('@')[0],
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      let insertResult;
      try {
        insertResult = await supabase
          .from('users')
          .insert({
            id: newUser.id,
            email: newUser.email,
            password_hash: newUser.password_hash,
            display_name: newUser.display_name,
            role: newUser.role,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at,
          })
          .select('id, email, password_hash, display_name, role, created_at, updated_at')
          .single();
      } catch (err) {
        console.error('[DB Persist Error] Unexpected exception during Supabase user insert:', err.message);
        const dbErr = new Error('Database persistence failed. Account could not be created.');
        dbErr.statusCode = 503;
        throw dbErr;
      }

      const { data, error } = insertResult || {};
      if (error) {
        if (error.code === '23505') {
          console.warn('[DB Persist Conflict] User registration email already exists (code: 23505)');
          const conflictErr = new Error('Email already registered');
          conflictErr.statusCode = 409;
          throw conflictErr;
        }
        console.error('[DB Persist Error] Supabase user insert failed:', {
          code: error.code || 'UNKNOWN',
          message: error.message || 'Database error',
        });
        const dbErr = new Error('Database persistence failed. Account could not be created.');
        dbErr.statusCode = 503;
        throw dbErr;
      }

      if (data) {
        console.log(`[DB Persist Success] User ${data.id} successfully written to Supabase public.users (role: ${data.role})`);
        newUser.id = data.id;
        newUser.created_at = data.created_at || newUser.created_at;
        newUser.updated_at = data.updated_at || newUser.updated_at;
      }
    } else {
      console.log(`[DB Store Notice] Storing user ${newUser.id} in in-memory store (no Supabase client configured)`);
    }

    const idx = users.findIndex(u => u.id === newUser.id || u.email === newUser.email);
    if (idx >= 0) users[idx] = newUser;
    else users.push(newUser);

    this.addAuditLog('user_registered', { userId: newUser.id, email: newUser.email });
    return newUser;
  },

  async updateUser(id, updates) {
    const updatedAt = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase) {
      try {
        const dbUpdates = { ...updates, updated_at: updatedAt };
        delete dbUpdates.id;
        const { data, error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('id', id)
          .select('id, email, password_hash, display_name, role, created_at, updated_at')
          .maybeSingle();

        if (!error && data) {
          const user = {
            id: data.id,
            email: data.email.toLowerCase(),
            password_hash: data.password_hash,
            display_name: data.display_name,
            role: data.role,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
          const idx = users.findIndex(u => u.id === user.id);
          if (idx >= 0) users[idx] = user;
          else users.push(user);
          return user;
        }
      } catch (err) {
        console.warn('[DB] Supabase updateUser error:', err.message);
      }
    }

    const u = users.find(u => u.id === id);
    if (u) Object.assign(u, updates, { updated_at: updatedAt });
    return u || null;
  },

  async getAllUsers() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, display_name, role, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (!error && data) {
          for (const row of data) {
            const existing = users.find(u => u.id === row.id);
            if (!existing) {
              users.push({
                id: row.id,
                email: row.email.toLowerCase(),
                password_hash: '',
                display_name: row.display_name,
                role: row.role,
                created_at: row.created_at,
                updated_at: row.updated_at,
              });
            }
          }
          return data.map(u => ({
            id: u.id,
            email: u.email,
            display_name: u.display_name,
            role: u.role,
            created_at: u.created_at,
          }));
        }
      } catch (err) {
        console.warn('[DB] Supabase getAllUsers error:', err.message);
      }
    }

    return users.map(u => ({
      id: u.id, email: u.email, display_name: u.display_name,
      role: u.role, created_at: u.created_at,
    }));
  },

  userCount() { return users.length; },

  /* ── Test Helpers ──────────────────────────────────────────────────── */
  _clearUsersCacheForTesting() {
    users = [];
  },
  _setUsersCacheForTesting(mockUsers = []) {
    users = [...mockUsers];
  },

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
  async getStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
    let totalUsersCount = users.length;
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        if (!error && typeof count === 'number') {
          totalUsersCount = count;
        }
      } catch {}
    }
    return {
      totalUsers: totalUsersCount,
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
