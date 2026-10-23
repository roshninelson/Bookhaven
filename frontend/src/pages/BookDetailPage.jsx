import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCart } from '../contexts/CartContext.jsx';
import { useWishlist } from '../contexts/WishlistContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { money } from '../components/BookCard.jsx';
import BookCard from '../components/BookCard.jsx';
import AuthModal from '../components/AuthModal.jsx';
import BookPreviewReader from '../components/BookPreviewReader.jsx';
import * as api from '../services/api.js';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Bookmark,
  MessageSquare
} from 'lucide-react';

export default function BookDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToast } = useToast();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [eligibility, setEligibility] = useState({ loading: true, eligible: false, hasReviewed: false, existingReview: null });
  const [isEditing, setIsEditing] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);

  useEffect(() => {
    async function loadBookData() {
      try {
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const res = await api.fetchBook(id);
        if (res.data) {
          setBook(res.data);
          setReviews(res.reviews || []);
          setRelated(res.related || []);
        }
      } catch (err) {
        console.error('Failed to load book details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookData();
  }, [id]);

  useEffect(() => {
    async function checkEligibility() {
      if (!user) {
        setEligibility({ loading: false, eligible: false, hasReviewed: false, existingReview: null });
        return;
      }
      try {
        const res = await api.fetchReviewEligibility(id);
        setEligibility({
          loading: false,
          eligible: Boolean(res.eligible),
          hasReviewed: Boolean(res.hasReviewed),
          existingReview: res.existingReview || null,
        });
        if (res.hasReviewed && res.existingReview) {
          setRating(res.existingReview.rating || 5);
          setReviewBody(res.existingReview.body || '');
        }
      } catch {
        setEligibility({ loading: false, eligible: false, hasReviewed: false, existingReview: null });
      }
    }
    checkEligibility();
  }, [id, user]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#777b70' }}>
        <BookOpen size={40} style={{ animation: 'pulse 1.5s infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '14px' }}>Loading book details...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px' }}>Book not found</h2>
        <p style={{ color: '#777b70', margin: '16px 0 24px' }}>
          The requested title is not currently available in our catalogue.
        </p>
        <Link to="/catalog" className="primary-btn">
          Back to Catalogue
        </Link>
      </div>
    );
  }

  const isWished = wishlist.includes(book.id);

  function handleAddToCart() {
    addToCart(book, qty);
    addToast(`Added ${qty} × "${book.title}" to your bag`, 'success');
  }

  function handleWishlist() {
    toggleWishlist(book.id);
    addToast(isWished ? 'Removed from wishlist' : 'Added to wishlist ❤️', 'info');
  }

  async function handleAddReadingList(status = 'want_to_read') {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await api.addToReadingList(book.id);
      addToast(`Added to your bookshelf (${status.replace(/_/g, ' ')})`, 'success');
    } catch (err) {
      addToast(err?.message || 'Could not update bookshelf', 'error');
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!eligibility.eligible) {
      addToast('Purchase this book to leave a review.', 'error');
      return;
    }
    if (!reviewBody.trim()) {
      addToast('Please write a short review before submitting', 'error');
      return;
    }

    try {
      setSubmittingReview(true);
      const isEdit = eligibility.hasReviewed;
      const res = isEdit
        ? await api.updateReviewAPI(book.id, { rating, body: reviewBody.trim() })
        : await api.addReview(book.id, rating, reviewBody.trim());

      if (res.data) {
        if (isEdit) {
          setReviews(reviews.map(r => (r.id === res.data.id || r.user_id === user.id) ? { ...res.data, user_name: user.display_name } : r));
          addToast('Your review has been updated successfully!', 'success');
        } else {
          setReviews([{ ...res.data, user_name: user.display_name }, ...reviews]);
          addToast('Thank you! Your verified review has been published.', 'success');
        }
        setIsEditing(false);
        setEligibility(prev => ({
          ...prev,
          hasReviewed: true,
          existingReview: res.data,
        }));
      }
    } catch (err) {
      addToast(err?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '30px 5% 80px' }}>
      <Link
        to="/catalog"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#6e7467',
          textDecoration: 'none',
          marginBottom: '28px',
        }}
      >
        <ArrowLeft size={15} /> Back to shelf
      </Link>

      {/* Main Book Detail Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '50px',
          alignItems: 'start',
          marginBottom: '70px',
        }}
      >
        {/* Cover Art Container */}
        <div
          style={{
            background: '#eeece2',
            padding: '40px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minHeight: '440px',
          }}
        >
          <img
            src={book.cover_url}
            alt={book.title}
            style={{
              maxHeight: '380px',
              maxWidth: '85%',
              objectFit: 'contain',
              boxShadow: '12px 18px 30px rgba(36,41,28,0.25)',
              borderRadius: '2px',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <button
            onClick={handleWishlist}
            className={`wish-btn ${isWished ? 'wished' : ''}`}
            style={{ top: '16px', right: '16px', width: '36px', height: '36px' }}
            aria-label="Wishlist toggle"
          >
            <Heart size={18} fill={isWished ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            style={{
              position: 'absolute',
              bottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '20px',
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--line, #e0ded3)',
              color: 'var(--ink, #24392c)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              zIndex: 3,
            }}
          >
            <BookOpen size={14} style={{ color: 'var(--green, #254f3b)' }} /> Read Preview
          </button>
        </div>

        {/* Book Details */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '1px',
                fontWeight: 700,
                color: '#254f3b',
                background: '#e4ebdc',
                padding: '4px 10px',
                borderRadius: '2px',
                textTransform: 'uppercase',
              }}
            >
              {book.category}
            </span>
            {book.featured && (
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: '#a83c27',
                  background: '#fbece8',
                  padding: '4px 10px',
                  borderRadius: '2px',
                }}
              >
                ★ FEATURED READ
              </span>
            )}
          </div>

          <h1
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(32px, 3.5vw, 44px)',
              lineHeight: 1.15,
              margin: '0 0 10px',
              color: '#24392c',
            }}
          >
            {book.title}
          </h1>

          <p style={{ fontSize: '15px', color: '#687063', margin: '0 0 18px', fontStyle: 'italic' }}>
            by <strong style={{ color: '#254f3b', fontStyle: 'normal' }}>{book.author}</strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#bd8a4e', fontSize: '13px' }}>
              <Star size={16} fill="currentColor" />
              <b>{book.rating || 4.8}</b>
            </div>
            <span style={{ color: '#888b80', fontSize: '12px' }}>
              ({(reviews.length || book.review_count || 0).toLocaleString('en-IN')} verified reader reviews)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#24392c' }}>
              {money(book.price)}
            </span>
            {book.old_price && (
              <del style={{ fontSize: '16px', color: '#979a8e' }}>{money(book.old_price)}</del>
            )}
            {book.old_price && (
              <span style={{ fontSize: '11px', color: '#254f3b', fontWeight: 600 }}>
                Save {Math.round(((book.old_price - book.price) / book.old_price) * 100)}%
              </span>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2ded5', borderBottom: '1px solid #e2ded5', padding: '20px 0', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#82877a', margin: '0 0 10px' }}>
              About this work
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#4a5348', margin: 0 }}>
              {book.description ||
                'A deeply evocative and insightful work that explores the profound truths of human nature and conscious living. Filled with timeless wisdom and memorable reflections.'}
            </p>
          </div>

          {/* Stock Indicator */}
          <div style={{ marginBottom: '24px', fontSize: '12px' }}>
            {book.stock > 5 ? (
              <span style={{ color: '#254f3b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Check size={16} /> In Stock ({book.stock} copies available ready to ship)
              </span>
            ) : book.stock > 0 ? (
              <span style={{ color: '#c96d4d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ⚠️ Hurry, only {book.stock} copies remaining in our warehouse!
              </span>
            ) : (
              <span style={{ color: '#a83c27', fontWeight: 600 }}>Currently Out of Stock</span>
            )}
          </div>

          {/* Quantity and Actions */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid #d3d5c9',
                borderRadius: '3px',
                background: '#faf9f5',
              }}
            >
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                style={{ padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span style={{ padding: '0 8px', fontWeight: 600, fontSize: '13px' }}>{qty}</span>
              <button
                onClick={() => setQty(Math.min(book.stock || 99, qty + 1))}
                style={{ padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              className="primary-btn"
              onClick={handleAddToCart}
              style={{ flex: 1, minWidth: '180px', padding: '14px 20px', gap: '8px' }}
            >
              <ShoppingBag size={17} /> Add to Bag · {money(book.price * qty)}
            </button>

            <button
              type="button"
              onClick={() => setReaderOpen(true)}
              className="secondary-btn"
              style={{
                padding: '14px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '12px',
                borderColor: 'var(--green, #254f3b)',
                color: 'var(--green, #254f3b)',
                background: 'var(--card-bg, #ffffff)',
                cursor: 'pointer',
              }}
              title="Open swipeable ebook preview reader"
            >
              <BookOpen size={16} /> Read Preview
            </button>

            <button
              onClick={() => handleAddReadingList('want_to_read')}
              className="secondary-btn"
              title="Add to personal bookshelf"
              style={{ padding: '14px' }}
            >
              <Bookmark size={16} />
            </button>
          </div>

          {/* Delivery & Assurance Strip */}
          <div
            style={{
              background: '#f2f0e8',
              padding: '16px 20px',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '11px',
              color: '#555e52',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={15} style={{ color: '#254f3b' }} />
              <span>
                <b>Free Express Shipping</b> on orders above ₹799. Delivery within 2-4 business days.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={15} style={{ color: '#254f3b' }} />
              <span>
                <b>Collector-Grade Packaging:</b> Carefully bubble-wrapped and boxed to arrive in pristine condition.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Reviews & Ratings Section */}
      <section style={{ borderTop: '1px solid #e2ded5', paddingTop: '50px', marginBottom: '70px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: '6px' }}>
              <MessageSquare size={13} style={{ color: '#d96c43' }} /> COMMUNITY REFLECTIONS
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', margin: 0, color: '#24392c' }}>
              Reader Reviews ({reviews.length})
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Playfair Display, serif', color: '#254f3b' }}>
              {book.rating || 4.8}
            </span>
            <div style={{ fontSize: '11px', color: '#777b70' }}>
              <div style={{ display: 'flex', color: '#bd8a4e' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} fill="currentColor" />
                ))}
              </div>
              <span>Overall reader satisfaction</span>
            </div>
          </div>
        </div>

        {/* Verified Purchase Gate / Review Form */}
        {!user ? (
          <div
            style={{
              background: '#faf9f4',
              border: '1px solid #e2dfd5',
              borderRadius: '4px',
              padding: '24px',
              marginBottom: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#254f3b', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                <ShieldCheck size={18} /> Purchase Verification Required
              </div>
              <p style={{ fontSize: '11px', color: '#777b70', margin: 0, maxWidth: '520px' }}>
                BookHaven enforces authentic, verified-buyer-only reviews. Sign in to your account to check if you have purchased this volume.
              </p>
            </div>
            <button
              className="primary-btn"
              onClick={() => setAuthModalOpen(true)}
              style={{ padding: '9px 18px', fontSize: '11px' }}
            >
              Sign In to Review
            </button>
          </div>
        ) : !eligibility.eligible ? (
          <div
            style={{
              background: '#f8f6f0',
              border: '1px dashed #d5d0c2',
              borderRadius: '4px',
              padding: '24px',
              marginBottom: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', margin: '0 0 6px', color: '#24392c' }}>
                Purchase this book to leave a review.
              </h3>
              <p style={{ fontSize: '11px', color: '#777b70', margin: 0, maxWidth: '560px', lineHeight: 1.6 }}>
                Only readers who have ordered and received this title from BookHaven can submit ratings and comments. Cancelled or unpurchased titles do not qualify.
              </p>
            </div>
            <button
              className="primary-btn"
              onClick={handleAddToCart}
              style={{ padding: '9px 18px', fontSize: '11px', gap: '8px' }}
            >
              <ShoppingBag size={14} /> Add to Bag (₹{book.price})
            </button>
          </div>
        ) : eligibility.hasReviewed && !isEditing ? (
          <div
            style={{
              background: '#f1f5ee',
              border: '1px solid #d5decb',
              borderRadius: '4px',
              padding: '24px',
              marginBottom: '36px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#254f3b',
                    color: '#d5e58d',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  ✓ VERIFIED BUYER
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#24392c' }}>
                  Your reflection on this title
                </span>
              </div>
              <button
                className="secondary-btn"
                onClick={() => setIsEditing(true)}
                style={{ padding: '6px 14px', fontSize: '10px' }}
              >
                Edit Review
              </button>
            </div>
            <div style={{ display: 'flex', color: '#bd8a4e', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={15} fill={s <= (eligibility.existingReview?.rating || rating) ? 'currentColor' : 'none'} />
              ))}
            </div>
            <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#333e33', margin: 0 }}>
              "{eligibility.existingReview?.body || reviewBody}"
            </p>
          </div>
        ) : (
          <div
            style={{
              background: '#faf9f4',
              border: '1px solid #254f3b33',
              borderRadius: '4px',
              padding: '24px',
              marginBottom: '36px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span
                style={{
                  background: '#254f3b',
                  color: '#d5e58d',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                ✓ VERIFIED PURCHASER
              </span>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '19px', margin: 0, color: '#24392c' }}>
                {isEditing ? 'Update your review' : 'Share your verified reflection'}
              </h3>
            </div>
            <p style={{ fontSize: '11px', color: '#777b70', margin: '0 0 16px' }}>
              Your feedback is verified from your BookHaven order history.
            </p>

            <form onSubmit={handleReviewSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#444d41' }}>Your Rating:</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: star <= rating ? '#bd8a4e' : '#ccc9bc',
                        padding: '2px',
                      }}
                      title={`${star} stars`}
                    >
                      <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: '#687063' }}>({rating} out of 5 stars)</span>
              </div>

              <textarea
                rows={3}
                placeholder="What made this read special? Thoughts on the writing style or key takeaways..."
                value={reviewBody}
                maxLength={2000}
                onChange={(e) => setReviewBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dcdacf',
                  borderRadius: '3px',
                  font: "12px 'DM Sans', sans-serif",
                  outline: 'none',
                  marginBottom: '6px',
                  resize: 'vertical',
                  background: '#fff',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#979a8e', marginBottom: '12px' }}>
                <span>Verified Purchase Review</span>
                <span>{reviewBody.length} / 2000</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={submittingReview} className="primary-btn" style={{ padding: '10px 18px', fontSize: '11px' }}>
                  {submittingReview ? 'Saving...' : isEditing ? 'Save Changes' : 'Post Verified Review'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="secondary-btn"
                    style={{ padding: '10px 16px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Existing Reviews List */}
        {reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  background: '#faf9f5',
                  border: '1px solid #eae7dd',
                  padding: '20px',
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#e4ebdc',
                        color: '#254f3b',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {(rev.user_name || 'R').charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#24392c' }}>
                          {rev.user_name || 'BookHaven Reader'}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#254f3b',
                            background: '#e4ebdc',
                            padding: '1px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          ✓ Verified Purchase
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#929487' }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent review'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', color: '#bd8a4e' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={13} fill={s <= rev.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#444c40', margin: 0 }}>
                  "{rev.body}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontStyle: 'italic', color: '#888b80', fontSize: '12px' }}>
            No community reviews yet for this title. Be the first to share your thoughts!
          </p>
        )}
      </section>

      {/* Related Books */}
      {related.length > 0 && (
        <section style={{ borderTop: '1px solid #e2ded5', paddingTop: '50px' }}>
          <div className="section-heading" style={{ marginBottom: '24px' }}>
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> COMPLEMENTARY READS
              </div>
              <h2 style={{ fontSize: '32px' }}>You may also appreciate</h2>
            </div>
          </div>
          <div className="book-grid">
            {related.map((b) => (
              <BookCard
                key={b.id}
                book={b}
                onAdd={(item) => {
                  addToCart(item, 1);
                  addToast(`Added "${item.title}" to bag`, 'success');
                }}
                wished={wishlist.includes(b.id)}
                onWish={handleWishlist}
              />
            ))}
          </div>
        </section>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Dedicated Swipeable Ebook Preview Reader */}
      <BookPreviewReader
        isOpen={readerOpen}
        onClose={() => setReaderOpen(false)}
        book={book}
        onAddToCart={(b) => {
          addToCart(b, 1);
          addToast(`Added "${b.title}" to bag`, 'success');
        }}
      />
    </div>
  );
}
