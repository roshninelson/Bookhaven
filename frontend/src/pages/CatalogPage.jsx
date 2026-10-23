import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import * as api from '../services/api.js';
import { BookOpen, ChevronDown, Filter, Search, Sparkles } from 'lucide-react';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState(['All books']);
  const [loading, setLoading] = useState(true);

  const initialCat = searchParams.get('category') || 'All books';
  const initialQ = searchParams.get('q') || '';
  const initialSort = searchParams.get('sort') || 'featured';

  const [category, setCategory] = useState(initialCat);
  const [query, setQuery] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);
  const [inStockOnly, setInStockOnly] = useState(false);

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [booksRes, catRes] = await Promise.all([
          api.fetchBooks({ limit: 50 }),
          api.fetchCategories().catch(() => ({ data: [] })),
        ]);
        if (booksRes.data) setBooks(booksRes.data);
        if (catRes.data && catRes.data.length > 0) {
          setCategories(['All books', ...catRes.data]);
        }
      } catch (err) {
        console.error('Failed to load books catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (category && category !== 'All books') p.set('category', category);
    if (query.trim()) p.set('q', query.trim());
    if (sort && sort !== 'featured') p.set('sort', sort);
    setSearchParams(p, { replace: true });
  }, [category, query, sort, setSearchParams]);

  const filteredBooks = useMemo(() => {
    let list = [...books];
    const q = query.trim().toLowerCase();

    if (category !== 'All books') {
      list = list.filter((b) => b.category?.toLowerCase() === category.toLowerCase());
    }

    if (q) {
      list = list.filter((b) =>
        `${b.title} ${b.author} ${b.category} ${b.description || ''}`.toLowerCase().includes(q)
      );
    }

    if (inStockOnly) {
      list = list.filter((b) => (b.stock || 0) > 0);
    }

    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'newest') list.sort((a, b) => (b.id > a.id ? 1 : -1));

    return list;
  }, [books, category, query, sort, inStockOnly]);

  function handleAdd(book) {
    addToCart(book, 1);
    addToast(`Added "${book.title}" to bag`, 'success');
  }

  function handleWish(id) {
    toggleWishlist(id);
    const isWished = wishlist.includes(id);
    addToast(isWished ? 'Removed from wishlist' : 'Saved to wishlist ❤️', 'info');
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 5% 80px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>
          <span className="eyebrow-line" /> THE FULL COLLECTION
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: ' clamp(36px, 4vw, 52px)', margin: '0 0 10px', color: '#24392c' }}>
          Explore the Bookshelf
        </h1>
        <p style={{ color: '#777b70', fontSize: '13px', maxWidth: '600px', margin: 0 }}>
          Discover exceptional works across personal growth, science fiction, philosophy, finance, and creative living.
        </p>
      </div>

      {/* Toolbar & Filters */}
      <div className="shop-toolbar" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="category-list">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? 'category-chip active' : 'category-chip'}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="shop-controls" style={{ flexWrap: 'wrap' }}>
          <label className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title, author, themes..."
            />
          </label>

          <label className="sort-select">
            <span>Sort:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="rating">Highest Rated</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#687363', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              style={{ accentColor: '#254f3b' }}
            />
            In Stock Only
          </label>
        </div>
      </div>

      {/* Meta Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '11px', color: '#777b70' }}>
        <span>
          Showing <b>{filteredBooks.length}</b> of <b>{books.length}</b> books
        </span>
        {(category !== 'All books' || query || inStockOnly) && (
          <button
            onClick={() => {
              setCategory('All books');
              setQuery('');
              setInStockOnly(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#d96c43',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Books Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#777b70' }}>
          <BookOpen size={36} style={{ animation: 'pulse 1.5s infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '13px' }}>Unpacking the bookshelf...</p>
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAdd={handleAdd}
              wished={wishlist.includes(book.id)}
              onWish={handleWish}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={36} />
          <h3>No matching books found</h3>
          <p>Try searching for a different keyword or category.</p>
          <button
            className="secondary-btn"
            onClick={() => {
              setQuery('');
              setCategory('All books');
              setInStockOnly(false);
            }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
