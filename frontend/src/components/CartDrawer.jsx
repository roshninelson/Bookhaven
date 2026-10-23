import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext.jsx';
import { money } from './BookCard.jsx';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { cart, cartCount, subtotal, updateQty, removeFromCart } = useCart();

  if (!isOpen) return null;

  const freeShippingThreshold = 799;
  const freeShippingUnlocked = subtotal >= freeShippingThreshold;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <span className="eyebrow">YOUR LITTLE BOOK PILE</span>
            <h2>
              Your bag <span>({cartCount})</span>
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close bag">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-bag">
              <ShoppingBag size={27} />
            </div>
            <h3>Your next favourite is waiting.</h3>
            <p>Your bag is currently empty. Explore our shelves for something enchanting.</p>
            <button
              className="primary-btn"
              onClick={() => {
                onClose();
                navigate('/catalog');
              }}
            >
              Browse the shelf <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="cart-item-info">
                    <h3>{item.title}</h3>
                    <p>{item.author}</p>
                    <strong>{money(item.price)}</strong>
                    <div className="qty-control">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="remove-item"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="shipping-note">
                <Truck size={17} />
                {freeShippingUnlocked
                  ? '🎉 You unlocked free shipping!'
                  : `Add ${money(amountToFreeShipping)} more for free shipping`}
              </div>
              <div className="subtotal">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p>Taxes and shipping calculated at checkout.</p>
              <button
                className="checkout-btn"
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
              >
                Proceed to Checkout <ArrowRight size={17} />
              </button>
              <small className="test-note">
                <ShieldCheck size={13} /> 100% secure checkout · Satisfaction guaranteed
              </small>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
