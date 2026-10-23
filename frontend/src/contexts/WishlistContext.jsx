import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import * as api from '../services/api.js';

const WishlistContext = createContext(null);

const LS_KEY = 'bh_wishlist';
function loadGuestWishlist() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
function saveGuestWishlist(ids) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
}

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      api.fetchWishlist()
        .then((res) => {
          setItems(res.data || []);
          const guestItems = loadGuestWishlist();
          if (guestItems.length > 0) {
            api.mergeWishlistAPI(guestItems)
              .then((res2) => {
                setItems(res2.data || []);
                localStorage.removeItem(LS_KEY);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      setItems(loadGuestWishlist());
    }
  }, [isAuthenticated]);

  const toggle = useCallback((bookId) => {
    const id = String(bookId);
    setItems((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      if (!isAuthenticated) saveGuestWishlist(next);
      return next;
    });
    if (isAuthenticated) {
      const has = items.includes(id);
      if (has) api.removeFromWishlistAPI(id).catch(() => {});
      else api.addToWishlistAPI(id).catch(() => {});
    }
  }, [isAuthenticated, items]);

  const removeFromWishlist = useCallback((bookId) => {
    const id = String(bookId);
    setItems((prev) => {
      const next = prev.filter((x) => x !== id);
      if (!isAuthenticated) saveGuestWishlist(next);
      return next;
    });
    if (isAuthenticated) api.removeFromWishlistAPI(id).catch(() => {});
  }, [isAuthenticated]);

  const clearWishlist = useCallback(() => {
    setItems([]);
    if (!isAuthenticated) localStorage.removeItem(LS_KEY);
  }, [isAuthenticated]);

  const isWished = useCallback((bookId) => items.includes(String(bookId)), [items]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        wishlist: items,
        wishlistCount: items.length,
        toggle,
        toggleWishlist: toggle,
        removeFromWishlist,
        clearWishlist,
        isWished,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
