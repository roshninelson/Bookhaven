import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { WishlistProvider } from './contexts/WishlistContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';

import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import ReadingListPage from './pages/ReadingListPage.jsx';
import RecommendationsPage from './pages/RecommendationsPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

function AppContent() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="site-shell">
      <Navbar onOpenCart={() => setCartOpen(true)} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/bookshelf" element={<ReadingListPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="dev-ribbon">
        <span /> BOOKHAVEN PROD-READY ARCHITECTURE
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
