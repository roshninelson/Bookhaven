import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { money } from '../components/BookCard.jsx';
import * as api from '../services/api.js';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  Package,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [shipping, setShipping] = useState({
    name: user?.display_name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);

  if (cart.length === 0 && !orderComplete) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#24392c' }}>
          Your bag is empty
        </h2>
        <p style={{ color: '#777b70', fontSize: '12px', margin: '14px 0 24px' }}>
          Add some titles to your bag before checking out.
        </p>
        <Link to="/catalog" className="primary-btn">
          Explore Books <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const [discountAmount, setDiscountAmount] = useState(0);

  // Shipping cost calculation
  const shippingFee = subtotal >= 799 ? 0 : 49;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  async function handleApplyCoupon(e) {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await api.validateCoupon(code, subtotal);
      if (res.data) {
        setDiscountAmount(res.data.discount);
        setCouponApplied(`${res.data.code} (${res.data.description})`);
        addToast(`Coupon ${res.data.code} applied! Saved ${money(res.data.discount)}.`, 'success');
      }
    } catch (err) {
      setDiscountAmount(0);
      setCouponApplied('');
      addToast(err?.message || 'Invalid coupon code. Try WELCOME10 or READMORE.', 'error');
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!shipping.name || !shipping.email || !shipping.address || !shipping.city || !shipping.postalCode) {
      addToast('Please complete all required shipping fields.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items: cart.map((i) => ({ bookId: i.id, qty: i.qty })),
        shippingAddress: shipping,
        paymentMethod,
        couponCode: couponApplied ? couponCode.trim().toUpperCase() : null,
      };

      const res = await api.createOrder(payload);
      if (res.data) {
        setOrderComplete(res.data);
        clearCart();
        addToast('Order placed successfully! Thank you for reading with us.', 'success');
      }
    } catch (err) {
      addToast(err?.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (orderComplete) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto 80px', padding: '40px 24px', background: '#faf9f4', border: '1px solid #e5e2d8', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e4ebdc', color: '#254f3b', margin: '0 auto 20px', display: 'grid', placeItems: 'center' }}>
          <Check size={32} />
        </div>
        <span className="eyebrow" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          THANK YOU FOR YOUR PATRONAGE
        </span>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', margin: '0 0 12px', color: '#24392c' }}>
          Your story is on its way.
        </h1>
        <p style={{ fontSize: '13px', color: '#777b70', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          We have received your order <b>#{orderComplete.id?.slice(0, 8)}</b>. A confirmation email has been dispatched to <b>{shipping.email}</b>.
        </p>

        <div style={{ background: '#f2f0e7', padding: '16px 20px', borderRadius: '4px', fontSize: '12px', textAlign: 'left', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Order Total:</span>
            <b>{money(orderComplete.total || grandTotal)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Estimated Delivery:</span>
            <span>3 - 5 business days</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Shipping To:</span>
            <span>{shipping.city}, {shipping.postalCode}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          {user ? (
            <Link to="/orders" className="primary-btn">
              View Order in Dashboard <Package size={15} />
            </Link>
          ) : (
            <Link to="/catalog" className="primary-btn">
              Continue Browsing Shelf <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 5% 80px' }}>
      <Link
        to="/catalog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#6e7467',
          textDecoration: 'none',
          marginBottom: '28px',
        }}
      >
        <ArrowLeft size={15} /> Back to shelf
      </Link>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', margin: '0 0 8px', color: '#24392c' }}>
          Complete your purchase
        </h1>
        <p style={{ color: '#777b70', fontSize: '12px', margin: 0 }}>
          Safe, encrypted checkout with instant dispatch from our literary archive.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          alignItems: 'start',
        }}
      >
        {/* Shipping & Payment Form */}
        <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 1: Shipping Details */}
          <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '24px', borderRadius: '4px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', margin: '0 0 16px', color: '#24392c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} style={{ color: '#254f3b' }} /> 1. Delivery Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  Recipient Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Virginia Woolf"
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  placeholder="reader@bookhaven.dev"
                  value={shipping.email}
                  onChange={(e) => setShipping({ ...shipping, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                Delivery Address *
              </label>
              <input
                required
                type="text"
                placeholder="Flat / House No., Street, Landmark"
                value={shipping.address}
                onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  City *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Mumbai"
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  State *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Maharashtra"
                  value={shipping.state}
                  onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555d51', marginBottom: '4px' }}>
                  PIN Code *
                </label>
                <input
                  required
                  type="text"
                  placeholder="400001"
                  value={shipping.postalCode}
                  onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #dcdacf', borderRadius: '3px', font: "12px 'DM Sans'", background: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div style={{ background: '#faf9f5', border: '1px solid #e5e2d8', padding: '24px', borderRadius: '4px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', margin: '0 0 16px', color: '#24392c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#254f3b' }} /> 2. Payment Method
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: paymentMethod === 'card' ? '1px solid #254f3b' : '1px solid #e0ddd3',
                  background: paymentMethod === 'card' ? '#f0f4ec' : '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  style={{ accentColor: '#254f3b' }}
                />
                <b>Credit / Debit Card (Visa, MasterCard, Rupay)</b>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: paymentMethod === 'upi' ? '1px solid #254f3b' : '1px solid #e0ddd3',
                  background: paymentMethod === 'upi' ? '#f0f4ec' : '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  style={{ accentColor: '#254f3b' }}
                />
                <b>Instant UPI / NetBanking (GPay, PhonePe, Paytm)</b>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: paymentMethod === 'cod' ? '1px solid #254f3b' : '1px solid #e0ddd3',
                  background: paymentMethod === 'cod' ? '#f0f4ec' : '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  style={{ accentColor: '#254f3b' }}
                />
                <b>Cash on Delivery (Pay upon doorstep receipt)</b>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="primary-btn"
            style={{ width: '100%', padding: '16px', fontSize: '13px' }}
          >
            {submitting ? 'Confirming order...' : `Place Order · ${money(grandTotal)}`}
            <Lock size={15} />
          </button>
        </form>

        {/* Order Summary Sidebar */}
        <div style={{ background: '#faf9f4', border: '1px solid #e5e2d8', borderRadius: '4px', padding: '24px' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', margin: '0 0 16px', color: '#24392c' }}>
            Order Summary ({cart.length} titles)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
            {cart.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src={item.cover_url}
                  alt={item.title}
                  style={{ width: '40px', height: '56px', objectFit: 'contain', background: '#eeece2', borderRadius: '2px' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#24392c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#777b70' }}>Qty: {item.qty}</div>
                </div>
                <strong style={{ fontSize: '12px', color: '#24392c' }}>{money(item.price * item.qty)}</strong>
              </div>
            ))}
          </div>

          {/* Coupon Code Input */}
          <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Tag size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: '#888b80' }} />
              <input
                type="text"
                placeholder="Discount code (e.g. WELCOME10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                style={{ width: '100%', padding: '9px 10px 9px 30px', border: '1px solid #dcdacf', borderRadius: '3px', font: "11px 'DM Sans'", background: '#fff' }}
              />
            </div>
            <button type="submit" className="secondary-btn" style={{ padding: '8px 12px', fontSize: '11px' }}>
              Apply
            </button>
          </form>

          {couponApplied && (
            <div style={{ background: '#e4ebdc', color: '#254f3b', fontSize: '11px', padding: '6px 10px', borderRadius: '3px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span>✓ {couponApplied}</span>
              <button
                type="button"
                onClick={() => { setDiscountAmount(0); setDiscountPercent(0); setCouponApplied(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#254f3b', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Price Breakdown */}
          <div style={{ borderTop: '1px solid #e2ded5', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#687063' }}>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#254f3b', fontWeight: 600 }}>
                <span>Coupon Discount</span>
                <span>-{money(discountAmount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#687063' }}>
              <span>Shipping</span>
              <span>{shippingFee === 0 ? <b style={{ color: '#254f3b' }}>FREE</b> : money(shippingFee)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: '#24392c', borderTop: '1px solid #e2ded5', paddingTop: '12px' }}>
              <span>Total Amount</span>
              <span>{money(grandTotal)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', color: '#888b80', fontSize: '10px' }}>
            <ShieldCheck size={14} style={{ color: '#254f3b' }} />
            <span>Encrypted SSL transaction · 100% Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}
