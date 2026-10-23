import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Plus, Star } from 'lucide-react';

export const money = n =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function BookCard({ book, onAdd, wished, onWish }) {
  if (!book) return null;

  return (
    <article className="book-card">
      <div className="cover-wrap">
        <span className="book-tag">
          {book.featured ? 'READER FAVOURITE' : (book.category || 'FEATURED').toUpperCase()}
        </span>
        <button
          className={`wish-btn ${wished ? 'wished' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWish?.(book.id);
          }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
        </button>
        <Link to={`/books/${book.id}`} className="cover-link" style={{ display: 'contents' }}>
          <img
            className="book-cover"
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
          <div className="cover-fallback">
            <BookOpen size={30} />
            <span>{book.title}</span>
          </div>
        </Link>
        <button
          className="quick-add"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd?.(book);
          }}
        >
          <Plus size={15} /> Quick add
        </button>
      </div>

      <div className="book-info">
        <div className="rating">
          <Star size={13} fill="currentColor" />
          <b>{book.rating || 4.5}</b>
          <span>({(book.review_count || 0).toLocaleString('en-IN')})</span>
        </div>
        <h3>
          <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {book.title}
          </Link>
        </h3>
        <p className="author">by {book.author}</p>
        <div className="price-line">
          <strong>{money(book.price)}</strong>
          {book.old_price && <del>{money(book.old_price)}</del>}
          {book.stock <= 5 && book.stock > 0 && (
            <span style={{ fontSize: '9px', color: '#c96d4d', marginLeft: 'auto', fontWeight: 600 }}>
              Only {book.stock} left
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
