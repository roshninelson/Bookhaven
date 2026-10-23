import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext.jsx';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { money } from '../components/BookCard.jsx';
import * as api from '../services/api.js';
import {
  ArrowRight,
  BookOpen,
  Heart,
  Plus,
  Send,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

const MOODS = [
  { label: 'Deep Focus', value: 'productivity' },
  { label: 'Late Night Wonder', value: 'fiction' },
  { label: 'Mindset & Habits', value: 'growth' },
  { label: 'Financial Freedom', value: 'finance' },
  { label: 'Creative Spark', value: 'creativity' },
  { label: 'Epic Escapism', value: 'sci-fi' },
];

export default function RecommendationsPage() {
  const [query, setQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [maxPrice, setMaxPrice] = useState(600);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToast } = useToast();

  async function handleFindBooks(e) {
    if (e) e.preventDefault();
    if (!query && !selectedMood) {
      addToast('Please enter what you feel like reading or select a reading mood', 'info');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const res = await api.getRecommendations({
        query: query.trim(),
        mood: selectedMood,
        maxPrice,
      });

      if (res.data) {
        setRecommendations(res.data);
      }
    } catch (err) {
      console.error('Recommendations failed:', err);
      addToast('Could not fetch recommendations at this time', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickPrompt(text, mood) {
    setQuery(text);
    setSelectedMood(mood);
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 5% 80px' }}>
      {/* Concierge Intro */}
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '8px' }}>
          <Sparkles size={14} style={{ color: '#d96c43' }} /> LITERARY INTELLIGENCE ENGINE
        </div>
        <h1
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(34px, 4vw, 48px)',
            margin: '0 0 14px',
            color: '#24392c',
          }}
        >
          Your Personal Reading Concierge
        </h1>
        <p style={{ color: '#777b70', fontSize: '13px', lineHeight: 1.7 }}>
          Tell us about your current mood, what questions you are pondering, or books you previously loved.
          Our discovery engine will find matching volumes.
        </p>
      </div>

      {/* Interactive Input Form */}
      <div
        style={{
          background: '#faf9f4',
          border: '1px solid #e5e2d8',
          borderRadius: '6px',
          padding: '28px',
          marginBottom: '40px',
        }}
      >
        <form onSubmit={handleFindBooks}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <textarea
              rows={3}
              placeholder="e.g. 'I want a book that teaches me to cultivate focus and deep work without feeling burned out' or 'Something lyrical set in an infinite universe'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #dcdacf',
                borderRadius: '4px',
                font: "13px 'DM Sans', sans-serif",
                outline: 'none',
                background: '#fff',
                resize: 'none',
              }}
            />
          </div>

          {/* Quick Mood Chips */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#555d51', display: 'block', marginBottom: '8px' }}>
              Choose a Reading Mood:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setSelectedMood(selectedMood === m.value ? '' : m.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: selectedMood === m.value ? '1px solid #254f3b' : '1px solid #dcdacf',
                    background: selectedMood === m.value ? '#254f3b' : '#fff',
                    color: selectedMood === m.value ? '#fff' : '#687363',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Filter and Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#687363' }}>
                Max Budget: <b>{money(maxPrice)}</b>
              </span>
              <input
                type="range"
                min="200"
                max="800"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ accentColor: '#254f3b', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-btn"
              style={{ padding: '12px 24px', fontSize: '12px' }}
            >
              {loading ? 'Curating recommendations...' : 'Generate Recommendations'}
              <Sparkles size={15} />
            </button>
          </div>
        </form>

        {/* Example prompts */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #dedacf', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: '#888b80', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            Try an idea:
          </span>
          <button
            type="button"
            onClick={() => handleQuickPrompt('Practical framework to build better daily discipline', 'growth')}
            style={{ fontSize: '10px', background: '#f0ede1', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', color: '#3d4d3a' }}
          >
            "Daily habits & self-discipline"
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('Grand sci-fi worldbuilding with deep philosophical themes', 'sci-fi')}
            style={{ fontSize: '10px', background: '#f0ede1', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', color: '#3d4d3a' }}
          >
            "Philosophical Sci-Fi"
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('How to think about wealth without falling into greed', 'finance')}
            style={{ fontSize: '10px', background: '#f0ede1', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', color: '#3d4d3a' }}
          >
            "Relationship with wealth & money"
          </button>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#777b70' }}>
          <Sparkles size={36} style={{ animation: 'spin 3s linear infinite', color: '#d96c43', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: '0 0 6px', color: '#24392c' }}>
            Consulting the Literary Archive...
          </h3>
          <p style={{ fontSize: '12px', margin: 0 }}>Matching your prompt against themes, ratings, and reader resonance.</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', margin: 0, color: '#24392c' }}>
              Curated for your palate ({recommendations.length} picks)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {recommendations.map((rec, idx) => {
              const book = rec.book || rec;
              const isWished = wishlist.includes(book.id);

              return (
                <div
                  key={book.id || idx}
                  style={{
                    background: '#faf9f5',
                    border: '1px solid #e5e2d8',
                    borderRadius: '4px',
                    padding: '24px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '24px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <Link to={`/books/${book.id}`}>
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        style={{
                          width: '90px',
                          height: '130px',
                          objectFit: 'contain',
                          background: '#eeece2',
                          borderRadius: '2px',
                          boxShadow: '4px 6px 15px rgba(0,0,0,0.1)',
                        }}
                      />
                    </Link>

                    <div>
                      <span
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.8px',
                          fontWeight: 700,
                          color: '#254f3b',
                          background: '#e4ebdc',
                          padding: '3px 8px',
                          borderRadius: '2px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {book.category}
                      </span>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', margin: '8px 0 4px', color: '#24392c' }}>
                        <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {book.title}
                        </Link>
                      </h3>
                      <div style={{ fontSize: '12px', color: '#777b70', marginBottom: '8px' }}>
                        by {book.author}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#24392c' }}>
                          {money(book.price)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#bd8a4e', fontSize: '11px' }}>
                          <Star size={13} fill="currentColor" />
                          <b>{book.rating}</b>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Reasoning / Match Score */}
                  <div style={{ borderLeft: '1px solid #e5e2d8', paddingLeft: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d96c43', fontWeight: 700, marginBottom: '6px' }}>
                      <Zap size={13} />
                      <span>{rec.match_score || Math.min(99, Math.round((rec.relevance_score || 85) * 1.1))}% CURATOR MATCH</span>
                    </div>
                    <p style={{ fontSize: '12px', lineHeight: 1.6, color: '#4d574b', margin: '0 0 16px', fontStyle: 'italic' }}>
                      "{rec.reason || (Array.isArray(rec.reasons) ? rec.reasons.join(' · ') : null) || book.description || 'Highly resonant with your reading prompt.'}"
                    </p>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="primary-btn"
                        onClick={() => {
                          addToCart(book, 1);
                          addToast(`Added "${book.title}" to bag`, 'success');
                        }}
                        style={{ padding: '8px 16px', fontSize: '11px', gap: '6px' }}
                      >
                        <Plus size={14} /> Quick Add
                      </button>
                      <button
                        onClick={() => {
                          toggleWishlist(book.id);
                          addToast(isWished ? 'Removed from wishlist' : 'Saved to wishlist ❤️', 'info');
                        }}
                        className={`wish-btn ${isWished ? 'wished' : ''}`}
                        style={{ position: 'static', width: '34px', height: '34px' }}
                        aria-label="Wishlist"
                      >
                        <Heart size={15} fill={isWished ? 'currentColor' : 'none'} />
                      </button>
                      <Link to={`/books/${book.id}`} className="secondary-btn" style={{ padding: '8px 14px', fontSize: '11px' }}>
                        View Details <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : hasSearched ? (
        <div className="empty-state">
          <BookOpen size={36} />
          <h3>No precise matches for this combination</h3>
          <p>Try broadening your query, raising your budget, or trying one of our suggested themes.</p>
        </div>
      ) : null}
    </div>
  );
}
