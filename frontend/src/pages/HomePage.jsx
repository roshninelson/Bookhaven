import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import * as api from '../services/api.js';
import {
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Heart,
} from 'lucide-react';

const fallbackBooks = [
  { id: 'b1', title: 'Atomic Habits', author: 'James Clear', category: 'Personal Growth', price: 399, old_price: 499, rating: 4.8, review_count: 2841, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/81wgcld4wxL.jpg', description: 'Tiny changes, remarkable results.', stock: 24, featured: true },
  { id: 'b2', title: 'The Midnight Library', author: 'Matt Haig', category: 'Fiction', price: 349, old_price: 450, rating: 4.6, review_count: 1620, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg', description: 'Between life and death there is a library.', stock: 12, featured: true },
  { id: 'b3', title: 'Deep Work', author: 'Cal Newport', category: 'Productivity', price: 429, old_price: 550, rating: 4.7, review_count: 987, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/81JJ7fyyKyS.jpg', description: 'Rules for focused success in a distracted world.', stock: 18, featured: true },
  { id: 'b4', title: 'Ikigai', author: 'Héctor García & Francesc Miralles', category: 'Personal Growth', price: 299, old_price: 399, rating: 4.5, review_count: 1204, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/71tbalAHYCL.jpg', description: 'The Japanese secret to a long and happy life.', stock: 31 },
  { id: 'b5', title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Finance', price: 379, old_price: 499, rating: 4.8, review_count: 1923, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/71g2ednj0JL.jpg', description: 'Timeless lessons on wealth, greed, and happiness.', stock: 9 },
  { id: 'b6', title: 'Dune', author: 'Frank Herbert', category: 'Sci-Fi', price: 499, old_price: 650, rating: 4.7, review_count: 2311, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/81ym3QUd3KL.jpg', description: 'A landmark science-fiction epic set on Arrakis.', stock: 14 },
  { id: 'b7', title: 'Educated', author: 'Tara Westover', category: 'Memoir', price: 389, old_price: 499, rating: 4.6, review_count: 842, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/81NwYZ6VZTL.jpg', description: 'A memoir about education and self-invention.', stock: 7 },
  { id: 'b8', title: 'The Creative Act', author: 'Rick Rubin', category: 'Creativity', price: 599, old_price: 799, rating: 4.9, review_count: 734, cover_url: 'https://images-na.ssl-images-amazon.com/images/I/71pWzhdJNwL.jpg', description: 'A beautiful meditation on the creative process.', stock: 16 }
];

export default function HomePage() {
  const [books, setBooks] = useState(fallbackBooks);
  const [categoriesList, setCategoriesList] = useState(['All books', 'Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Personal Growth', 'Philosophy']);
  const [apiState, setApiState] = useState('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All books');
  const [sort, setSort] = useState('featured');

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    Promise.all([
      api.fetchBooks({ limit: 50 }),
      api.fetchCategories().catch(() => ({ data: [] })),
    ])
      .then(([booksRes, catRes]) => {
        if (!active) return;
        if (Array.isArray(booksRes.data) && booksRes.data.length > 0) {
          setBooks(booksRes.data);
          setApiState('connected');
        } else {
          setApiState('demo');
        }
        if (Array.isArray(catRes.data) && catRes.data.length > 0) {
          setCategoriesList(['All books', ...catRes.data]);
        }
      })
      .catch(() => {
        if (active) setApiState('demo');
      });
    return () => { active = false; };
  }, []);

  const visibleBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = books.filter((b) => {
      const matchCat = category === 'All books' || b.category?.toLowerCase() === category.toLowerCase();
      const matchQ = !q || `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    if (sort === 'price-asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') result = [...result].sort((a, b) => b.price - a.price);
    if (sort === 'rating') result = [...result].sort((a, b) => b.rating - a.rating);
    return result;
  }, [books, query, category, sort]);

  function handleAdd(book) {
    addToCart(book, 1);
    addToast(`Added "${book.title}" to your bag`, 'success');
  }

  function handleWish(id) {
    toggleWishlist(id);
    const isWished = wishlist.includes(id);
    addToast(isWished ? 'Removed from wishlist' : 'Added to wishlist ❤️', 'info');
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE ART OF GETTING LOST IN A BOOK
          </div>
          <h1>
            Stories worth
            <br />
            staying up <em>for.</em>
          </h1>
          <p>
            For the curious minds, the late-night page turners, and everyone looking
            for a little magic between the covers.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="#shop">
              Find your next read <ArrowRight size={17} />
            </a>
            <Link
              to="/recommendations"
              className="secondary-btn"
              style={{ background: '#faf8f1', borderColor: '#d3d7c5' }}
            >
              <Sparkles size={15} style={{ color: '#d96c43' }} /> Ask AI Curator
            </Link>
            <span className="micro-note">
              <span className="avatar-stack">
                <i>R</i>
                <i>M</i>
                <i>A</i>
              </span>{' '}
              Loved by 12,000+ readers
            </span>
          </div>
          <div className="hero-footnote">
            <span>
              <ShieldCheck size={16} /> Thoughtfully curated
            </span>
            <span>
              <Truck size={17} /> Free delivery over ₹799
            </span>
          </div>
        </div>

        <div className="hero-art">
          <div className="sun-disc" />
          <div className="hero-label label-top">
            A GOOD BOOK
            <br />
            CHANGES EVERYTHING.
          </div>
          <div className="book-stack">
            <div className="stack-book stack-one">
              <span>
                THE
                <br />
                ART OF
                <br />
                SLOWING
                <br />
                DOWN
              </span>
              <small>WORDS FOR A FULLER LIFE</small>
            </div>
            <div className="stack-book stack-two">
              <span>
                the little
                <br />
                things
              </span>
              <small>A FIELD GUIDE TO WONDER</small>
            </div>
            <div className="stack-book stack-three">
              <span>
                somewhere,
                <br />
                something
                <br />
                beautiful
              </span>
              <small>NOTES FROM THE EVERYDAY</small>
            </div>
          </div>
          <div className="hero-label label-bottom">
            TURN THE PAGE.
            <br />
            SEE WHERE IT TAKES YOU <ArrowDownRight size={18} />
          </div>
          <div className="sparkle s1">✳</div>
          <div className="sparkle s2">✳</div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip">
        <div>
          <span className="trust-icon">
            <Truck size={19} />
          </span>
          <span>
            <b>Free delivery</b>
            <small>On orders over ₹799</small>
          </span>
        </div>
        <div>
          <span className="trust-icon">
            <ShieldCheck size={19} />
          </span>
          <span>
            <b>Authentic editions</b>
            <small>Direct from publishers</small>
          </span>
        </div>
        <div>
          <span className="trust-icon">
            <Heart size={19} />
          </span>
          <span>
            <b>Reader first</b>
            <small>Handpicked recommendations</small>
          </span>
        </div>
        <div>
          <span className="trust-icon">
            <Sparkles size={19} />
          </span>
          <span>
            <b>AI Discovery</b>
            <small>Mood & theme based matches</small>
          </span>
        </div>
      </section>

      {/* Shop Section */}
      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> THE BOOKSHELF
            </div>
            <h2>
              Find your kind
              <br className="mobile-break" /> of <em>wonder.</em>
            </h2>
          </div>
          <p>Big ideas, new worlds, and words that stay with you long after the last page.</p>
        </div>

        <div className="shop-toolbar">
          <div className="category-list">
            {categoriesList.map((c) => (
              <button
                key={c}
                className={category === c ? 'category-chip active' : 'category-chip'}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="shop-controls">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, author, mood..."
                aria-label="Search books"
              />
              <kbd>⌘ K</kbd>
            </label>
            <label className="sort-select">
              <span>Sort:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="rating">Top rated</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>

        <div className="results-line">
          <span>{visibleBooks.length} thoughtful reads</span>
          <span className="data-state">
            <i className={apiState === 'connected' ? 'live-dot' : 'demo-dot'} />
            {apiState === 'connected'
              ? 'Live catalog connected'
              : apiState === 'loading'
              ? 'Connecting to catalog...'
              : 'Preview catalog'}
          </span>
        </div>

        <div className="book-grid">
          {visibleBooks.slice(0, 12).map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAdd={handleAdd}
              wished={wishlist.includes(book.id)}
              onWish={handleWish}
            />
          ))}
        </div>

        {!visibleBooks.length && (
          <div className="empty-state">
            <BookOpen size={34} />
            <h3>No pages found.</h3>
            <p>Try searching for a different author, title, or category.</p>
            <button
              className="secondary-btn"
              onClick={() => {
                setQuery('');
                setCategory('All books');
              }}
            >
              Show all books
            </button>
          </div>
        )}

        <div className="view-all-wrap">
          <Link to="/catalog" className="secondary-btn">
            Explore the whole shelf ({books.length} books) <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Quote Band */}
      <section className="quote-band" id="bestsellers">
        <div className="quote-mark">“</div>
        <blockquote>
          A reader lives a thousand lives before he dies. The man who never reads lives only one.
        </blockquote>
        <span>— George R. R. Martin</span>
        <div className="quote-doodle">✳</div>
      </section>
    </main>
  );
}
