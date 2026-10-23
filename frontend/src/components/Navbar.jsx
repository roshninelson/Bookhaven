import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import AuthModal from './AuthModal.jsx';
import ThemeSelector from './ThemeSelector.jsx';
import {
  BookOpen,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  X,
  ShieldAlert,
  LogOut,
  Package,
  Compass,
  Bookmark
} from 'lucide-react';

export default function Navbar({ onOpenCart }) {
  const { user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  function handleLogout() {
    logout();
    setUserDropdown(false);
    navigate('/');
  }

  return (
    <>
      <div className="announcement">
        <Sparkles size={13} /> A little something for your next chapter{' '}
        <span>—</span> Free shipping on orders over ₹799
      </div>

      <header className="topbar">
        <Link to="/" className="brand" onClick={() => setMobileMenu(false)}>
          <span className="brand-mark">
            <BookOpen size={21} />
          </span>
          <span>
            bookhaven<span className="brand-dot">.</span>
            <small>YOUR NEXT CHAPTER STARTS HERE</small>
          </span>
        </Link>

        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'}>
          <NavLink
            to="/"
            end
            onClick={() => setMobileMenu(false)}
            style={({ isActive }) => ({ color: isActive ? '#254f3b' : undefined, fontWeight: isActive ? 600 : 500 })}
          >
            Home
          </NavLink>
          <NavLink
            to="/catalog"
            onClick={() => setMobileMenu(false)}
            style={({ isActive }) => ({ color: isActive ? '#254f3b' : undefined, fontWeight: isActive ? 600 : 500 })}
          >
            Discover
          </NavLink>
          <NavLink
            to="/recommendations"
            onClick={() => setMobileMenu(false)}
            style={({ isActive }) => ({
              color: isActive ? '#254f3b' : undefined,
              fontWeight: isActive ? 600 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            })}
          >
            <Sparkles size={13} style={{ color: '#d96c43' }} /> AI Discovery
          </NavLink>
          <NavLink
            to="/bookshelf"
            onClick={() => setMobileMenu(false)}
            style={({ isActive }) => ({ color: isActive ? '#254f3b' : undefined, fontWeight: isActive ? 600 : 500 })}
          >
            Bookshelf
          </NavLink>
          {user && (
            <NavLink
              to="/orders"
              onClick={() => setMobileMenu(false)}
              style={({ isActive }) => ({ color: isActive ? '#254f3b' : undefined, fontWeight: isActive ? 600 : 500 })}
            >
              My Orders
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenu(false)}
              style={({ isActive }) => ({
                color: '#842f1b',
                background: '#f9e7e1',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              })}
            >
              <ShieldAlert size={13} /> Admin
            </NavLink>
          )}
        </nav>

        <div className="top-actions">
          <ThemeSelector />

          <Link
            to="/catalog"
            className="icon-btn"
            aria-label="Search and Browse"
            title="Browse catalog"
          >
            <Search size={18} />
          </Link>

          <Link
            to="/wishlist"
            className="icon-btn wishlist-top"
            aria-label="Wishlist"
            title="View saved wishlist"
            style={{ position: 'relative' }}
          >
            <Heart size={18} />
            {wishlistCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: '#d96c43',
                  color: '#fff',
                  fontSize: '9px',
                  borderRadius: '50%',
                  width: '15px',
                  height: '15px',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                }}
              >
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* User Account / Auth trigger */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                onClick={() => setUserDropdown(!userDropdown)}
                aria-label="Account options"
                title={user.display_name || user.email}
                style={{ border: '1px solid #d5dbc9' }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#254f3b',
                    textTransform: 'uppercase',
                  }}
                >
                  {(user.display_name || user.email || 'U').charAt(0)}
                </span>
              </button>

              {userDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '48px',
                    background: '#faf9f4',
                    border: '1px solid #dcdacf',
                    borderRadius: '4px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    minWidth: '200px',
                    padding: '8px 0',
                    zIndex: 40,
                  }}
                  onMouseLeave={() => setUserDropdown(false)}
                >
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid #ebe8dc' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: '#24392c' }}>
                      {user.display_name || 'Reader'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#777b70', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </div>
                  </div>

                  <Link
                    to="/bookshelf"
                    onClick={() => setUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '11px',
                      color: '#333e35',
                      textDecoration: 'none',
                    }}
                  >
                    <Bookmark size={14} /> My Bookshelf
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setUserDropdown(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '11px',
                      color: '#333e35',
                      textDecoration: 'none',
                    }}
                  >
                    <Package size={14} /> Order History
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        fontSize: '11px',
                        color: '#a83c27',
                        fontWeight: 600,
                        textDecoration: 'none',
                        borderTop: '1px dashed #dedacf',
                        borderBottom: '1px dashed #dedacf',
                        margin: '4px 0',
                        background: '#fcf3f0',
                      }}
                    >
                      <ShieldAlert size={14} /> Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 16px',
                      fontSize: '11px',
                      color: '#6f7368',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="secondary-btn"
              onClick={() => setAuthModalOpen(true)}
              style={{
                padding: '7px 14px',
                fontSize: '11px',
                gap: '6px',
                borderRadius: '20px',
              }}
            >
              <User size={14} /> Sign In
            </button>
          )}

          <button className="bag-btn" onClick={onOpenCart} aria-label="Open cart bag">
            <ShoppingBag size={18} />
            <span>Bag</span>
            <b>{cartCount}</b>
          </button>

          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
