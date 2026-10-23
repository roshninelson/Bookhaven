import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as api from '../services/api.js';

const CartContext = createContext(null);

const LS_KEY = 'bh_cart';
function loadGuestCart() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveGuestCart(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
}

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);   // [{id, title, author, price, old_price, cover_url, stock, qty}]
  const [loading, setLoading] = useState(false);

  /* Load cart on mount / auth change */
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      api.fetchCart()
        .then(res => {
          const serverItems = (res.data || []).map(ci => ({
            id: ci.bookId, qty: ci.qty,
            ...ci.book,
          }));
          setItems(serverItems);
          /* Merge guest cart items into server cart */
          const guestItems = loadGuestCart();
          if (guestItems.length > 0) {
            api.mergeCartAPI(guestItems.map(g => ({ bookId: g.id, qty: g.qty })))
              .then(() => api.fetchCart())
              .then(res2 => {
                setItems((res2.data || []).map(ci => ({ id: ci.bookId, qty: ci.qty, ...ci.book })));
                localStorage.removeItem(LS_KEY);
              }).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setItems(loadGuestCart());
    }
  }, [isAuthenticated]);

  const addToCart = useCallback((book, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === book.id);
      let next;
      if (existing) {
        next = prev.map(i => i.id === book.id
          ? { ...i, qty: Math.min(i.qty + quantity, i.stock || 99) } : i);
      } else {
        next = [...prev, { ...book, qty: Math.min(quantity, book.stock || 99) }];
      }
      if (!isAuthenticated) saveGuestCart(next);
      return next;
    });
    if (isAuthenticated) api.addToCartAPI(book.id, quantity).catch(() => {});
  }, [isAuthenticated]);

  const updateQty = useCallback((bookId, qty) => {
    if (qty <= 0) {
      setItems(prev => {
        const next = prev.filter(i => i.id !== bookId);
        if (!isAuthenticated) saveGuestCart(next);
        return next;
      });
      if (isAuthenticated) api.removeFromCartAPI(bookId).catch(() => {});
    } else {
      setItems(prev => {
        const next = prev.map(i => i.id === bookId ? { ...i, qty: Math.min(qty, i.stock || 99) } : i);
        if (!isAuthenticated) saveGuestCart(next);
        return next;
      });
      if (isAuthenticated) api.updateCartQtyAPI(bookId, qty).catch(() => {});
    }
  }, [isAuthenticated]);

  const removeFromCart = useCallback((bookId) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== bookId);
      if (!isAuthenticated) saveGuestCart(next);
      return next;
    });
    if (isAuthenticated) api.removeFromCartAPI(bookId).catch(() => {});
  }, [isAuthenticated]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (!isAuthenticated) localStorage.removeItem(LS_KEY);
  }, [isAuthenticated]);

  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      items, cart: items, loading, cartCount, subtotal,
      addToCart, updateQty, removeFromCart, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
