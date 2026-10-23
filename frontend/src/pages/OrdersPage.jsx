import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { money } from '../components/BookCard.jsx';
import * as api from '../services/api.js';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const STATUS_STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await api.fetchOrders();
        if (res.data) setOrders(res.data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '420px', margin: '0 auto' }}>
        <Package size={40} style={{ color: '#254f3b', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#24392c' }}>
          Please sign in
        </h2>
        <p style={{ color: '#777b70', fontSize: '13px', margin: '12px 0 24px' }}>
          Sign in to your BookHaven account to view your past orders and track current shipments.
        </p>
        <Link to="/" className="primary-btn">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '40px 5% 80px' }}>
      <div style={{ marginBottom: '36px' }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          <span className="eyebrow-line" /> YOUR LITERARY ARCHIVE
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', margin: '0 0 10px', color: '#24392c' }}>
          Order History & Tracking
        </h1>
        <p style={{ color: '#777b70', fontSize: '13px', margin: 0 }}>
          Track the journey of every volume from our shelves to your home.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#777b70' }}>
          <Package size={32} style={{ animation: 'pulse 1.5s infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '12px' }}>Retrieving your order records...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={36} />
          <h3>No reading journeys yet</h3>
          <p>You haven't placed any orders yet. Discover our curated collection to start.</p>
          <Link to="/catalog" className="primary-btn" style={{ marginTop: '16px' }}>
            Browse Catalog <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {orders.map((order) => {
            const currentStepIdx = STATUS_STEPS.indexOf(order.status?.toLowerCase()) >= 0
              ? STATUS_STEPS.indexOf(order.status?.toLowerCase())
              : 0;

            return (
              <div
                key={order.id}
                style={{
                  background: '#faf9f4',
                  border: '1px solid #e5e2d8',
                  borderRadius: '4px',
                  padding: '24px',
                }}
              >
                {/* Header line */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e8e5dc',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#888b80', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Order Ref #{order.id?.slice(0, 8)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#444d41', marginTop: '4px' }}>
                      <Calendar size={13} />
                      <span>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#254f3b' }}>
                      {money(order.total)}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        marginTop: '4px',
                        background: order.status === 'delivered' ? '#d8e8d2' : '#faeadf',
                        color: order.status === 'delivered' ? '#27522d' : '#a84c2a',
                      }}
                    >
                      {order.status || 'Placed'}
                    </span>
                  </div>
                </div>

                {/* Tracking Progress Bar */}
                <div style={{ margin: '24px 0 20px', padding: '0 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '4%',
                        right: '4%',
                        height: '2px',
                        background: '#e0ded3',
                        zIndex: 1,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '4%',
                        width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 92}%`,
                        height: '2px',
                        background: '#254f3b',
                        zIndex: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />

                    {STATUS_STEPS.map((step, idx) => {
                      const isPastOrCurrent = idx <= currentStepIdx;
                      return (
                        <div
                          key={step}
                          style={{
                            position: 'relative',
                            zIndex: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: isPastOrCurrent ? '#254f3b' : '#f0eee6',
                              border: `2px solid ${isPastOrCurrent ? '#254f3b' : '#dedbd0'}`,
                              display: 'grid',
                              placeItems: 'center',
                              color: '#fff',
                              fontSize: '10px',
                            }}
                          >
                            {isPastOrCurrent && <CheckCircle2 size={12} />}
                          </div>
                          <span
                            style={{
                              fontSize: '9px',
                              textTransform: 'capitalize',
                              marginTop: '6px',
                              fontWeight: idx === currentStepIdx ? 700 : 500,
                              color: isPastOrCurrent ? '#24392c' : '#a0a298',
                            }}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ordered Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                  {(order.items || []).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f3f1e9',
                        borderRadius: '3px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BookOpen size={16} style={{ color: '#687363' }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#24392c' }}>
                            {item.title || item.bookId || 'Book Edition'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#888b80' }}>
                            Quantity: {item.qty} × {money(item.price)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#24392c' }}>
                        {money((item.price || 0) * (item.qty || 1))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Destination note */}
                {order.shipping_address && (
                  <div style={{ marginTop: '16px', fontSize: '11px', color: '#777b70' }}>
                    Deliver to: <b>{order.shipping_address.name}</b> · {order.shipping_address.address}, {order.shipping_address.city}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
