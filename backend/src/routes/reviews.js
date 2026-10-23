import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { store } from '../lib/store.js';
import { listBooks } from '../lib/books.js';

const router = Router();

/* ── Permitted purchase statuses for review eligibility ────────────── */
export const ELIGIBLE_PURCHASE_STATUSES = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
export const INELIGIBLE_PURCHASE_STATUSES = ['cancelled', 'failed', 'refunded'];

/**
 * Checks if a user has a valid purchase of the given book.
 * Validates against server-side order store with eligible statuses.
 * NEVER trusts client-supplied flags, forged user IDs, or uncompleted orders.
 */
function verifyBuyerEligibility(userId, bookId) {
  if (!userId || !bookId) return { eligible: false, reason: 'unauthenticated' };
  const userOrders = store.getOrdersByUser(userId) || [];
  
  const eligibleOrder = userOrders.find(order => {
    if (!ELIGIBLE_PURCHASE_STATUSES.includes(order.status)) return false;
    return (order.items || []).some(item =>
      String(item.bookId || item.book_id || item.id) === String(bookId)
    );
  });

  if (!eligibleOrder) {
    return { eligible: false, reason: 'no_qualifying_purchase' };
  }

  return { eligible: true, orderId: eligibleOrder.id };
}

/* GET /api/books/:bookId/reviews/eligibility – Check if authenticated user can review */
router.get('/:bookId/eligibility', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.json({
      authenticated: false,
      eligible: false,
      message: 'Sign in to check review eligibility',
    });
  }

  const { eligible, orderId } = verifyBuyerEligibility(req.user.id, req.params.bookId);
  const existingReview = store.getReviewByUserAndBook(req.user.id, req.params.bookId);

  res.json({
    authenticated: true,
    eligible,
    hasReviewed: Boolean(existingReview),
    existingReview: existingReview || null,
    orderId: eligible ? orderId : null,
    message: eligible
      ? 'Verified purchaser'
      : 'Purchase this book to leave a review.',
  });
});

/* GET /api/books/:bookId/reviews */
router.get('/:bookId', optionalAuth, async (req, res) => {
  try {
    const rawReviews = store.getReviewsByBook(req.params.bookId);
    // Exclude rejected or pending reviews from public calculation
    const activeReviews = rawReviews.filter(r => r.status !== 'rejected' && r.status !== 'pending');

    const mapped = activeReviews.map(r => {
      const u = store.findUserById(r.user_id);
      return {
        ...r,
        user_name: u?.display_name || 'Reader',
        is_own: req.user?.id === r.user_id,
        is_verified_purchase: true,
      };
    });

    const totalReviews = mapped.length;
    const averageRating = totalReviews > 0
      ? Number((mapped.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1))
      : null;

    res.json({
      data: mapped,
      total_reviews: totalReviews,
      average_rating: averageRating,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews' });
  }
});

/* POST /api/books/:bookId/reviews */
router.post('/:bookId', authenticate, async (req, res) => {
  try {
    const { rating, body, comment, is_edit } = req.body || {};
    const textContent = (body || comment || '').trim();

    // 1. Enforce verified-buyer authorization on the backend
    const { eligible, orderId } = verifyBuyerEligibility(req.user.id, req.params.bookId);
    if (!eligible) {
      return res.status(403).json({
        error: 'Only verified purchasers of this book can leave a review.',
        message: 'Purchase this book to leave a review.',
        eligible: false,
      });
    }

    // 2. Validate rating range [1, 5]
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // 3. Validate comment length (max 2000 chars)
    if (textContent.length > 2000) {
      return res.status(400).json({ error: 'Review body must be under 2000 characters' });
    }

    // 4. Verify book exists
    const allBooks = await listBooks();
    const targetBook = allBooks.find(b => String(b.id) === req.params.bookId);
    if (!targetBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // 5. Prevent duplicate reviews per user per book unless an explicit edit flow is requested
    const existing = store.getReviewByUserAndBook(req.user.id, req.params.bookId);
    if (existing) {
      if (is_edit || req.query.edit === 'true') {
        const updated = store.updateReview(existing.id, {
          rating: numericRating,
          body: textContent,
        });
        return res.json({
          data: { ...updated, user_name: req.user.display_name },
          message: 'Review updated successfully',
        });
      }
      return res.status(409).json({
        error: 'You have already reviewed this book. Use the edit option to update your review.',
        existing_review_id: existing.id,
      });
    }

    // 6. Store review with server-derived verified status and audit
    const review = store.addReview({
      book_id: req.params.bookId,
      user_id: req.user.id,
      rating: numericRating,
      body: textContent,
      order_id: orderId,
      is_verified_purchase: true,
      status: 'approved',
    });

    res.status(201).json({
      data: { ...review, user_name: req.user.display_name },
      message: 'Review submitted successfully!',
    });
  } catch (err) {
    if (err.message?.includes('already reviewed')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Could not add review' });
  }
});

/* PUT /api/books/:bookId/reviews or PUT /api/books/:bookId/reviews/review/:id – Explicit Edit Flow */
router.put('/:bookId', authenticate, async (req, res) => {
  try {
    const { rating, body, comment } = req.body || {};
    const textContent = (body || comment || '').trim();

    const existing = store.getReviewByUserAndBook(req.user.id, req.params.bookId);
    if (!existing) {
      return res.status(404).json({ error: 'No existing review found to update' });
    }

    const updates = {};
    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
      updates.rating = numericRating;
    }
    if (textContent !== undefined) {
      if (textContent.length > 2000) {
        return res.status(400).json({ error: 'Review body must be under 2000 characters' });
      }
      updates.body = textContent;
    }

    const updated = store.updateReview(existing.id, updates);
    res.json({
      data: { ...updated, user_name: req.user.display_name },
      message: 'Review updated successfully',
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not update review' });
  }
});

/* DELETE /api/reviews/review/:id – delete own review (or admin) */
router.delete('/review/:id', authenticate, (req, res) => {
  const reviews = store.getAllReviews();
  const review = reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  store.deleteReview(req.params.id);
  res.json({ ok: true, message: 'Review deleted' });
});

export default router;
