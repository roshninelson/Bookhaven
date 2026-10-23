import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { money } from '../components/BookCard.jsx';
import * as api from '../services/api.js';
import { ArrowRight, BookOpen, Heart, ShoppingBag, Trash2 } from 'lucide-react';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { addToast } = useToast();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true);
        const res = await api.fetchBooks({ limit: 50 });
        if (res.data) setBooks(res.data);
      } catch (err) {
        console.error('Failed to load books for wishlist:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, []);

  const wishedBooks = books.filter((b) => wishlist.includes(b.id));

  function handleMoveToBag(book) {
    addToCart(book, 1);
    removeFromWishlist(book.id);
    addToast(`Moved "${book.title}" to your bag!`, 'success');
  }

  function handleRemove(id, title) {
    removeFromWishlist(id);
    addToast(`Removed "${title}" from wishlist`, 'info');
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 5% 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '8px' }}>
            <span className="eyebrow-line" /> SAVED FOR LATER
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', margin: '0 0 8px', color: '#24392c' }}>
            Your Wishlist ({wishlist.length})
          </h1>
          <p style={{ color: '#777b70', fontSize: '12px', margin: 0 }}>
            Curate your reading horizon and move books to your bag whenever you're ready.
          </p>
        </div>

        {wishedBooks.length > 0 && (
          <button
            onClick={clearWishlist}
            style={{
              background: 'none',
              border: 'none',
              color: '#a83c27',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all saved
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#777b70' }}>
          <Heart size={32} style={{ animation: 'pulse 1.5s infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '12px' }}>Loading saved titles...</p>
        </div>
      ) : wishedBooks.length === 0 ? (
        <div className="empty-state">
          <Heart size={36} />
          <h3>Your wishlist is quiet</h3>
          <p>Tap the heart icon on any book to keep it close for your next order.</p>
          <Link to="/catalog" className="primary-btn" style={{ marginTop: '16px' }}>
            Explore Catalogue <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {wishedBooks.map((book) => (
            <div
              key={book.id}
              style={{
                background: '#faf9f5',
                border: '1px solid #e5e2d8',
                borderRadius: '4px',
                padding: '16px',
                display: 'flex',
                gap: '16px',
              }}
            >
              <Link to={`/books/${book.id}`}>
                <img
                  src={book.cover_url}
                  alt={book.title}
                  style={{
                    width: '70px',
                    height: '100px',
                    objectFit: 'contain',
                    background: '#eeece2',
                    borderRadius: '2px',
                  }}
                />
              </Link>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#254f3b', fontWeight: 700, letterSpacing: '0.8px' }}>
                    {book.category}
                  </div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '15px', margin: '4px 0', color: '#24392c' }}>
                    <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {book.title}
                    </Link>
                  </h3>
                  <div style={{ fontSize: '11px', color: '#777b70' }}>by {book.author}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#24392c', marginTop: '6px' }}>
                    {money(book.price)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    className="primary-btn"
                    onClick={() => handleMoveToBag(book)}
                    style={{ padding: '6px 12px', fontSize: '10px', gap: '6px' }}
                  >
                    <ShoppingBag size={12} /> Move to Bag
                  </button>
                  <button
                    onClick={() => handleRemove(book.id, book.title)}
                    className="icon-btn"
                    style={{ width: '28px', height: '28px', color: '#979a8e' }}
                    title="Remove from wishlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
