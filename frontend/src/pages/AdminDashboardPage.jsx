import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { money } from '../components/BookCard.jsx';
import * as api from '../services/api.js';
import {
  ArrowLeft,
  BookOpen,
  Check,
  DollarSign,
  Package,
  Plus,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
  MessageSquare,
  History,
  Edit2,
  X
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('inventory');
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Book Create / Edit Modal State
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'Fiction',
    price: 399,
    old_price: 499,
    stock: 20,
    cover_url: '',
    description: '',
    featured: false,
  });

  // Coupon Form State
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percent',
    value: 10,
    min_order: 500,
    max_discount: '',
    max_uses: 100,
    expiry_date: '',
    active: true,
  });

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    async function loadAdminData() {
      try {
        setLoading(true);
        const [statsRes, booksRes, ordersRes, reviewsRes, couponsRes, auditRes] =
          await Promise.all([
            api.fetchAdminStats().catch(() => ({ data: {} })),
            api.fetchAdminBooks().catch(() => ({ data: [] })),
            api.fetchAdminOrders().catch(() => ({ data: [] })),
            api.fetchAdminReviews().catch(() => ({ data: [] })),
            api.fetchAdminCoupons().catch(() => ({ data: [] })),
            api.fetchAuditLogs().catch(() => ({ data: [] })),
          ]);

        if (statsRes.data) setStats(statsRes.data);
        if (booksRes.data) setBooks(booksRes.data);
        if (ordersRes.data) setOrders(ordersRes.data);
        if (reviewsRes.data) setReviews(reviewsRes.data);
        if (couponsRes.data) setCoupons(couponsRes.data);
        if (auditRes.data) setAuditLogs(auditRes.data);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '440px', margin: '0 auto' }}>
        <ShieldAlert size={48} style={{ color: '#a83c27', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#24392c' }}>
          Restricted Portal
        </h2>
        <p style={{ color: '#777b70', fontSize: '13px', margin: '12px 0 24px', lineHeight: 1.6 }}>
          Administrative privileges are required to view this terminal. Sign in with administrative credentials (e.g., <code>admin@bookhaven.dev / admin123</code>).
        </p>
        <Link to="/" className="primary-btn">
          Return to Storefront
        </Link>
      </div>
    );
  }

  /* ── Book Operations ── */
  function openNewBookModal() {
    setEditingBookId(null);
    setBookForm({
      title: '',
      author: '',
      category: 'Fiction',
      price: 399,
      old_price: 499,
      stock: 20,
      cover_url: '',
      description: '',
      featured: false,
    });
    setBookModalOpen(true);
  }

  function openEditBookModal(book) {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || 'Fiction',
      price: book.price || 399,
      old_price: book.old_price || 499,
      stock: book.stock || 20,
      cover_url: book.cover_url || '',
      description: book.description || '',
      featured: !!book.featured,
    });
    setBookModalOpen(true);
  }

  async function handleSaveBook(e) {
    e.preventDefault();
    try {
      if (editingBookId) {
        const res = await api.updateBook(editingBookId, bookForm);
        if (res.data) {
          setBooks((prev) => prev.map((b) => (b.id === editingBookId ? res.data : b)));
          addToast('Book details updated successfully', 'success');
        }
      } else {
        const res = await api.createBook(bookForm);
        if (res.data) {
          setBooks([res.data, ...books]);
          addToast('New book added to catalogue', 'success');
        }
      }
      setBookModalOpen(false);
    } catch (err) {
      addToast(err?.message || 'Failed to save book', 'error');
    }
  }

  async function handleDeleteBook(id, title) {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;
    try {
      await api.deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      addToast(`Book "${title}" removed from catalogue`, 'info');
    } catch (err) {
      addToast('Failed to delete book', 'error');
    }
  }

  /* ── Order Operations ── */
  async function handleUpdateOrderStatus(orderId, newStatus) {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      addToast(`Order #${orderId.slice(0, 8)} status set to ${newStatus}`, 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to update order status', 'error');
    }
  }

  /* ── Review Operations ── */
  async function handleDeleteReview(reviewId) {
    try {
      await api.deleteAdminReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      addToast('Review deleted by moderator', 'info');
    } catch (err) {
      addToast('Failed to delete review', 'error');
    }
  }

  /* ── Coupon Operations ── */
  function openNewCouponModal() {
    setEditingCouponId(null);
    setCouponForm({
      code: '',
      type: 'percent',
      value: 10,
      min_order: 500,
      max_discount: '',
      max_uses: 100,
      expiry_date: '',
      active: true,
    });
    setCouponModalOpen(true);
  }

  function openEditCouponModal(c) {
    setEditingCouponId(c.id);
    setCouponForm({
      code: c.code || '',
      type: c.type || 'percent',
      value: c.value || c.discount_percent || 10,
      min_order: c.min_order || 0,
      max_discount: c.max_discount || '',
      max_uses: c.max_uses || 0,
      expiry_date: c.expires_at ? c.expires_at.split('T')[0] : '',
      active: c.active !== false,
    });
    setCouponModalOpen(true);
  }

  async function handleSaveCoupon(e) {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      addToast('Coupon code is required', 'error');
      return;
    }
    const val = Number(couponForm.value);
    if (isNaN(val) || val <= 0) {
      addToast('Discount value must be a positive number', 'error');
      return;
    }
    if (couponForm.type === 'percent' && val > 100) {
      addToast('Percentage discount cannot exceed 100%', 'error');
      return;
    }

    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        type: couponForm.type,
        value: val,
        min_order: Number(couponForm.min_order) || 0,
        max_discount: couponForm.max_discount ? Number(couponForm.max_discount) : null,
        max_uses: Number(couponForm.max_uses) || 0,
        expires_at: couponForm.expiry_date || null,
        active: Boolean(couponForm.active),
      };

      if (editingCouponId) {
        const res = await api.updateCoupon(editingCouponId, payload);
        if (res.data) {
          setCoupons((prev) => prev.map((c) => (c.id === editingCouponId ? res.data : c)));
          addToast(`Coupon '${res.data.code}' updated successfully!`, 'success');
        }
      } else {
        const res = await api.createCoupon(payload);
        if (res.data) {
          setCoupons([res.data, ...coupons]);
          addToast(`Coupon '${res.data.code}' created successfully!`, 'success');
        }
      }
      setCouponModalOpen(false);
    } catch (err) {
      addToast(err?.message || 'Failed to save coupon', 'error');
    }
  }

  async function handleToggleCoupon(id) {
    try {
      const res = await api.toggleCoupon(id);
      if (res.data) {
        setCoupons((prev) => prev.map((c) => (c.id === id ? res.data : c)));
        addToast(`Coupon '${res.data.code}' is now ${res.data.active ? 'active' : 'inactive'}`, 'info');
      }
    } catch (err) {
      addToast(err?.message || 'Failed to toggle coupon status', 'error');
    }
  }

  async function handleDeleteCoupon(id, code) {
    if (!window.confirm(`Are you sure you want to permanently delete coupon '${code}'?`)) return;
    try {
      await api.deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      addToast(`Coupon '${code}' removed`, 'info');
    } catch (err) {
      addToast(err?.message || 'Failed to delete coupon', 'error');
    }
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '30px 5% 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '6px' }}>
            <span className="eyebrow-line" /> COMMAND CENTER
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '34px', margin: 0, color: '#24392c' }}>
            BookHaven Administration
          </h1>
        </div>

        <Link to="/" className="secondary-btn" style={{ padding: '8px 16px', fontSize: '11px' }}>
          <ArrowLeft size={14} /> Back to Storefront
        </Link>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '18px 20px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#254f3b', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Total Revenue</span>
            <DollarSign size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#24392c' }}>
            {money(stats?.totalRevenue || 12480)}
          </div>
          <div style={{ fontSize: '10px', color: '#777b70', marginTop: '4px' }}>From confirmed orders</div>
        </div>

        <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '18px 20px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#254f3b', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Total Orders</span>
            <Package size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#24392c' }}>
            {stats?.totalOrders || orders.length || 18}
          </div>
          <div style={{ fontSize: '10px', color: '#777b70', marginTop: '4px' }}>Processed & pending</div>
        </div>

        <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '18px 20px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#254f3b', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Live Titles</span>
            <BookOpen size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#24392c' }}>
            {books.length}
          </div>
          <div style={{ fontSize: '10px', color: '#777b70', marginTop: '4px' }}>Active in catalogue</div>
        </div>

        <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '18px 20px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#254f3b', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Active Readers</span>
            <Users size={16} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#24392c' }}>
            {stats?.totalUsers || 42}
          </div>
          <div style={{ fontSize: '10px', color: '#777b70', marginTop: '4px' }}>Registered accounts</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e5e2d8', paddingBottom: '12px', marginBottom: '24px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          className={activeTab === 'inventory' ? 'category-chip active' : 'category-chip'}
        >
          <BookOpen size={13} style={{ marginRight: '5px' }} /> Catalogue Inventory ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={activeTab === 'orders' ? 'category-chip active' : 'category-chip'}
        >
          <Package size={13} style={{ marginRight: '5px' }} /> Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={activeTab === 'reviews' ? 'category-chip active' : 'category-chip'}
        >
          <MessageSquare size={13} style={{ marginRight: '5px' }} /> Review Moderation ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={activeTab === 'coupons' ? 'category-chip active' : 'category-chip'}
        >
          <Tag size={13} style={{ marginRight: '5px' }} /> Coupons & Promotions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={activeTab === 'audit' ? 'category-chip active' : 'category-chip'}
        >
          <History size={13} style={{ marginRight: '5px' }} /> System Audit Log
        </button>
      </div>

      {/* ── TAB 1: INVENTORY MANAGEMENT ── */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: 0, color: '#24392c' }}>
              Catalogue Inventory
            </h2>
            <button className="primary-btn" onClick={openNewBookModal} style={{ padding: '8px 16px', fontSize: '11px', gap: '6px' }}>
              <Plus size={14} /> Add New Title
            </button>
          </div>

          <div style={{ overflowX: 'auto', background: '#faf9f5', border: '1px solid #e5e2d8', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f0ede1', borderBottom: '1px solid #e0ded3', color: '#555d51', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.8px' }}>
                  <th style={{ padding: '12px 16px' }}>Title & Author</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Price</th>
                  <th style={{ padding: '12px 16px' }}>Stock</th>
                  <th style={{ padding: '12px 16px' }}>Rating</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #ebe8dc' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#24392c' }}>{b.title}</div>
                      <div style={{ fontSize: '10px', color: '#888b80' }}>by {b.author}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '10px', background: '#e4ebdc', color: '#254f3b', padding: '3px 8px', borderRadius: '2px' }}>
                        {b.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{money(b.price)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: b.stock <= 5 ? '#c96d4d' : '#254f3b', fontWeight: 600 }}>
                        {b.stock} units
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>★ {b.rating}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => openEditBookModal(b)}
                        className="icon-btn"
                        style={{ display: 'inline-grid', width: '28px', height: '28px' }}
                        title="Edit title"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b.id, b.title)}
                        className="icon-btn"
                        style={{ display: 'inline-grid', width: '28px', height: '28px', color: '#a83c27' }}
                        title="Delete title"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ORDER MANAGEMENT ── */}
      {activeTab === 'orders' && (
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: '0 0 16px', color: '#24392c' }}>
            Customer Orders & Fulfillment
          </h2>
          <div style={{ overflowX: 'auto', background: '#faf9f5', border: '1px solid #e5e2d8', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f0ede1', borderBottom: '1px solid #e0ded3', color: '#555d51', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.8px' }}>
                  <th style={{ padding: '12px 16px' }}>Order ID</th>
                  <th style={{ padding: '12px 16px' }}>Customer / Email</th>
                  <th style={{ padding: '12px 16px' }}>Items</th>
                  <th style={{ padding: '12px 16px' }}>Total</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #ebe8dc' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px' }}>
                      #{o.id?.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{o.shipping_address?.name || 'Guest'}</div>
                      <div style={{ fontSize: '10px', color: '#888b80' }}>{o.shipping_address?.email || o.shipping_address?.city}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{(o.items || []).length} titles</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{money(o.total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px', textTransform: 'uppercase', background: o.status === 'delivered' ? '#d8e8d2' : '#faeadf', color: o.status === 'delivered' ? '#27522d' : '#a84c2a' }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #dcdacf', borderRadius: '3px', background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="placed">Placed</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                        <option value="failed">Failed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: REVIEWS MODERATION ── */}
      {activeTab === 'reviews' && (
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: '0 0 16px', color: '#24392c' }}>
            Reader Reviews & Moderation
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ background: '#faf9f5', border: '1px solid #e5e2d8', borderRadius: '4px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '12px', color: '#24392c' }}>{r.user_name || 'Reader'}</strong>
                    <span style={{ fontSize: '11px', color: '#bd8a4e' }}>★ {r.rating} / 5</span>
                    <span style={{ fontSize: '10px', color: '#888b80' }}>Book #{r.book_id}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#444c40', margin: 0 }}>"{r.body}"</p>
                </div>
                <button
                  onClick={() => handleDeleteReview(r.id)}
                  className="icon-btn"
                  style={{ color: '#a83c27' }}
                  title="Remove review"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: COUPONS & PROMOTIONS ── */}
      {activeTab === 'coupons' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: 0, color: 'var(--text-primary, #24392c)' }}>
                Discount Coupons & Marketing
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted, #777b70)', margin: '4px 0 0' }}>
                Create, monitor, and manage promotional codes with automated validation rules.
              </p>
            </div>
            <button className="primary-btn" onClick={openNewCouponModal} style={{ padding: '8px 16px', fontSize: '11px', gap: '6px' }}>
              <Plus size={14} /> Create Coupon
            </button>
          </div>

          <div style={{ overflowX: 'auto', background: 'var(--bg-surface, #faf9f5)', border: '1px solid var(--border-color, #e5e2d8)', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated, #f0ede1)', borderBottom: '1px solid var(--border-color, #e0ded3)', color: 'var(--text-secondary, #555d51)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.8px' }}>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Discount</th>
                  <th style={{ padding: '12px 16px' }}>Order Rules</th>
                  <th style={{ padding: '12px 16px' }}>Usage</th>
                  <th style={{ padding: '12px 16px' }}>Expiry</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                  const isExhausted = c.max_uses > 0 && (c.uses || 0) >= c.max_uses;

                  return (
                    <tr key={c.id || c.code} style={{ borderBottom: '1px solid var(--border-subtle, #ebe8dc)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '1px', color: 'var(--text-primary, #24392c)' }}>
                          {c.code}
                        </strong>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', background: 'var(--tag-bg, #e4ebdc)', color: 'var(--tag-text, #254f3b)', padding: '2px 8px', borderRadius: '2px', fontWeight: 700 }}>
                          {c.type === 'percent' ? `${c.value}% OFF` : `${money(c.value)} FLAT`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-secondary, #555d51)' }}>
                        <div>Min order: {money(c.min_order || 0)}</div>
                        {c.max_discount && <div style={{ fontSize: '10px', color: 'var(--text-muted, #888b80)' }}>Max discount: {money(c.max_discount)}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px' }}>
                        <span style={{ color: isExhausted ? '#a83c27' : 'inherit', fontWeight: isExhausted ? 700 : 400 }}>
                          {c.uses || 0} / {c.max_uses > 0 ? c.max_uses : '∞'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: isExpired ? '#a83c27' : 'var(--text-muted, #777b70)' }}>
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                        {isExpired && <span style={{ display: 'block', fontSize: '9px', fontWeight: 700 }}>EXPIRED</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                            background: c.active && !isExpired && !isExhausted ? '#d8e8d2' : '#faeadf',
                            color: c.active && !isExpired && !isExhausted ? '#27522d' : '#a84c2a',
                          }}
                        >
                          {c.active && !isExpired && !isExhausted ? 'Active' : !c.active ? 'Inactive' : isExpired ? 'Expired' : 'Exhausted'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleCoupon(c.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '10px',
                            borderRadius: '3px',
                            border: '1px solid var(--border-color, #dcdacf)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: c.active ? '#a83c27' : '#27522d',
                            marginRight: '6px',
                          }}
                        >
                          {c.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditCouponModal(c)}
                          className="icon-btn"
                          style={{ display: 'inline-grid', width: '28px', height: '28px', marginRight: '4px' }}
                          title="Edit coupon"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="icon-btn"
                          style={{ display: 'inline-grid', width: '28px', height: '28px', color: '#a83c27' }}
                          title="Delete coupon"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: AUDIT LOGS ── */}
      {activeTab === 'audit' && (
        <div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: '0 0 16px', color: '#24392c' }}>
            System Audit Trail
          </h2>
          <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', borderRadius: '4px', padding: '16px' }}>
            {auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', gap: '14px', padding: '6px 0', borderBottom: '1px solid #ebe8dc' }}>
                    <span style={{ color: '#888b80' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '12:00:00'}
                    </span>
                    <strong style={{ color: '#254f3b' }}>[{log.action}]</strong>
                    <span style={{ color: '#444d41' }}>
                      {log.user_email || 'admin'} · {JSON.stringify(log.details || {})}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#888b80', fontSize: '12px' }}>
                Audit logs are recorded upon admin modifications and order changes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOOK CREATE / EDIT MODAL ── */}
      {bookModalOpen && (
        <div className="drawer-overlay" onClick={() => setBookModalOpen(false)} style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f4', width: 'min(520px, 92vw)', padding: '30px', borderRadius: '6px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', margin: 0, color: '#24392c' }}>
                {editingBookId ? 'Edit Book Details' : 'Add New Book to Shelf'}
              </h2>
              <button className="icon-btn" onClick={() => setBookModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  Title *
                </label>
                <input
                  required
                  type="text"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                    Author *
                  </label>
                  <input
                    required
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                  >
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Personal Growth">Personal Growth</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Finance">Finance</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Memoir">Memoir</option>
                    <option value="Creativity">Creativity</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                    Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    value={bookForm.price}
                    onChange={(e) => setBookForm({ ...bookForm, price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    value={bookForm.old_price}
                    onChange={(e) => setBookForm({ ...bookForm, old_price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                    Stock Units *
                  </label>
                  <input
                    required
                    type="number"
                    value={bookForm.stock}
                    onChange={(e) => setBookForm({ ...bookForm, stock: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  Cover Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={bookForm.cover_url}
                  onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  Description / Synopsis
                </label>
                <textarea
                  rows={3}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#555d51', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={bookForm.featured}
                  onChange={(e) => setBookForm({ ...bookForm, featured: e.target.checked })}
                  style={{ accentColor: '#254f3b' }}
                />
                Mark as Featured / Reader's Choice
              </label>

              <button type="submit" className="primary-btn" style={{ padding: '12px', marginTop: '10px' }}>
                Save Title <Check size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── COUPON CREATE / EDIT MODAL ── */}
      {couponModalOpen && (
        <div className="drawer-overlay" onClick={() => setCouponModalOpen(false)} style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-surface, #faf9f4)', width: 'min(500px, 92vw)', padding: '30px', borderRadius: '6px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color, #e5e2d8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', margin: 0, color: 'var(--text-primary, #24392c)' }}>
                {editingCouponId ? 'Edit Promotional Coupon' : 'Create New Promotional Coupon'}
              </h2>
              <button className="icon-btn" onClick={() => setCouponModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                  Coupon Code *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. FESTIVE25"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Discount Type *
                  </label>
                  <select
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  >
                    <option value="percent">Percentage (% Off)</option>
                    <option value="flat">Flat Amount (₹ Off)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Discount Value * {couponForm.type === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={couponForm.type === 'percent' ? '100' : '10000'}
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Min. Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={couponForm.min_order}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Max Discount Cap (₹ optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="None"
                    value={couponForm.max_discount}
                    onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Usage Limit (0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={couponForm.max_uses}
                    onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary, #555d51)', marginBottom: '4px' }}>
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    value={couponForm.expiry_date}
                    onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color, #dcdacf)', borderRadius: '3px', font: "12px 'DM Sans'", background: 'var(--bg-input, #fff)', color: 'var(--text-primary, inherit)' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary, #555d51)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  style={{ accentColor: '#254f3b' }}
                />
                Activate immediately
              </label>

              <button type="submit" className="primary-btn" style={{ padding: '12px', marginTop: '10px' }}>
                {editingCouponId ? 'Save Coupon Changes' : 'Create Coupon'} <Check size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
