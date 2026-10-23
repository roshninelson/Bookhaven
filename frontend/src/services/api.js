function resolveBaseUrl() {
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      ? 'https://bookhaven-oqfj.onrender.com/api'
      : '/api')
  ).trim();

  const clean = envUrl.replace(/\/+$/, '');
  if (!clean) return '/api';
  if (clean.startsWith('/')) return clean;
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

const BASE = resolveBaseUrl();

function getToken() {
  try { return sessionStorage.getItem('bh_token'); } catch { return null; }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || 'Request failed', data };
  return data;
}

/* ── Auth ─────────────────────────────────────────────────────────────── */
export async function register(email, password, display_name) {
  const res = await request('/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, display_name }),
  });
  if (res.token) sessionStorage.setItem('bh_token', res.token);
  return res;
}

export async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  if (res.token) sessionStorage.setItem('bh_token', res.token);
  return res;
}

export async function getMe() { return request('/auth/me'); }
export async function updateProfile(data) {
  return request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
}
export async function logout() {
  try { await request('/auth/logout', { method: 'POST' }); } catch {}
  sessionStorage.removeItem('bh_token');
}
export function clearToken() { sessionStorage.removeItem('bh_token'); }
export function hasToken() { return !!getToken(); }

/* ── Books ────────────────────────────────────────────────────────────── */
export async function fetchBooks(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  return request(`/books?${qs}`);
}

export async function fetchBook(id) { return request(`/books/${id}`); }
export async function fetchBookPreview(id) { return request(`/books/${id}/preview`); }
export async function fetchCategories() { return request('/books/categories'); }

/* ── Cart (authenticated) ────────────────────────────────────────────── */
export async function fetchCart() { return request('/cart'); }
export async function addToCartAPI(bookId, qty = 1) {
  return request('/cart', { method: 'POST', body: JSON.stringify({ bookId, qty }) });
}
export async function updateCartQtyAPI(bookId, qty) {
  return request(`/cart/${bookId}`, { method: 'PUT', body: JSON.stringify({ qty }) });
}
export async function removeFromCartAPI(bookId) {
  return request(`/cart/${bookId}`, { method: 'DELETE' });
}
export async function mergeCartAPI(items) {
  return request('/cart/merge', { method: 'POST', body: JSON.stringify({ items }) });
}

/* ── Wishlist (authenticated) ────────────────────────────────────────── */
export async function fetchWishlist() { return request('/wishlist'); }
export async function addToWishlistAPI(bookId) {
  return request('/wishlist', { method: 'POST', body: JSON.stringify({ bookId }) });
}
export async function removeFromWishlistAPI(bookId) {
  return request(`/wishlist/${bookId}`, { method: 'DELETE' });
}
export async function mergeWishlistAPI(items) {
  return request('/wishlist/merge', { method: 'POST', body: JSON.stringify({ items }) });
}

/* ── Orders ───────────────────────────────────────────────────────────── */
export async function createOrder(data) {
  return request('/orders', { method: 'POST', body: JSON.stringify(data) });
}
export async function fetchOrders() { return request('/orders'); }
export async function fetchOrder(id) { return request(`/orders/${id}`); }

/* ── Reviews ──────────────────────────────────────────────────────────── */
export async function fetchReviews(bookId) { return request(`/reviews/${bookId}`); }
export async function fetchReviewEligibility(bookId) {
  return request(`/reviews/${bookId}/eligibility`);
}
export async function addReview(bookId, rating, body, is_edit = false) {
  return request(`/reviews/${bookId}`, {
    method: 'POST', body: JSON.stringify({ rating, body, is_edit }),
  });
}
export async function updateReviewAPI(bookId, data) {
  return request(`/reviews/${bookId}`, {
    method: 'PUT', body: JSON.stringify(data),
  });
}
export async function deleteReview(id) {
  return request(`/reviews/review/${id}`, { method: 'DELETE' });
}

/* ── Recommendations ──────────────────────────────────────────────────── */
export async function getRecommendations(data) {
  return request('/recommendations', { method: 'POST', body: JSON.stringify(data) });
}

/* ── Reading List ─────────────────────────────────────────────────────── */
export async function fetchReadingList() { return request('/reading-list'); }
export async function fetchMilestone(year) {
  return request(`/reading-list/milestone${year ? `?year=${year}` : ''}`);
}
export async function updateReadingGoal(goal, year) {
  return request('/reading-list/goal', {
    method: 'PUT', body: JSON.stringify({ goal, year }),
  });
}
export async function addToReadingList(bookId) {
  return request('/reading-list', { method: 'POST', body: JSON.stringify({ bookId }) });
}
export async function updateReadingListItem(bookId, data) {
  return request(`/reading-list/${bookId}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function removeFromReadingList(bookId) {
  return request(`/reading-list/${bookId}`, { method: 'DELETE' });
}

/* ── Admin ────────────────────────────────────────────────────────────── */
export async function fetchAdminStats() { return request('/admin/stats'); }
export async function fetchAdminBooks() { return request('/admin/books'); }
export async function createBook(data) {
  return request('/admin/books', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateBook(id, data) {
  return request(`/admin/books/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function deleteBook(id) {
  return request(`/admin/books/${id}`, { method: 'DELETE' });
}
export async function fetchAdminOrders() { return request('/admin/orders'); }
export async function updateOrderStatus(id, status) {
  return request(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
}
export async function fetchAdminUsers() { return request('/admin/users'); }
export async function fetchAdminReviews() { return request('/admin/reviews'); }
export async function deleteAdminReview(id) {
  return request(`/admin/reviews/${id}`, { method: 'DELETE' });
}
export async function fetchAdminCoupons() { return request('/admin/coupons'); }
export async function createCoupon(data) {
  return request('/admin/coupons', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCoupon(id, data) {
  return request(`/admin/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function toggleCoupon(id) {
  return request(`/admin/coupons/${id}/toggle`, { method: 'PATCH' });
}
export async function deleteCoupon(id) {
  return request(`/admin/coupons/${id}`, { method: 'DELETE' });
}
export async function validateCoupon(code, subtotal) {
  return request('/orders/validate-coupon', { method: 'POST', body: JSON.stringify({ code, subtotal }) });
}
export async function fetchAuditLogs() { return request('/admin/audit'); }
