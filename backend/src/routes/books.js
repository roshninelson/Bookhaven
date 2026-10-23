import { Router } from 'express';
import { listBooks, getCategories } from '../lib/books.js';
import { getBookPreview } from '../lib/previews.js';
import { optionalAuth } from '../middleware/auth.js';
import { store } from '../lib/store.js';

const router = Router();
const allowedSorts = new Set(['featured', 'price-asc', 'price-desc', 'rating', 'newest', 'popular']);

/* GET /api/books */
router.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
    const category = typeof req.query.category === 'string' ? req.query.category.slice(0, 60) : '';
    const sort = allowedSorts.has(req.query.sort) ? req.query.sort : 'featured';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 50));

    const books = await listBooks({ q, category, sort });
    const start = (page - 1) * limit;
    const paginated = books.slice(start, start + limit);

    res.json({
      data: paginated,
      count: paginated.length,
      total: books.length,
      page,
      totalPages: Math.ceil(books.length / limit),
    });
  } catch (err) { next(err); }
});

/* GET /api/books/categories */
router.get('/categories', (_req, res) => {
  res.json({ data: getCategories() });
});

/* GET /api/books/:id */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const books = await listBooks();
    const book = books.find(b => String(b.id) === req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    /* Track recently viewed for authenticated users */
    if (req.user) {
      store.addRecentlyViewed(req.user.id, String(book.id));
    }

    /* Get related books (same category, exclude current) */
    const related = books
      .filter(b => b.category === book.category && b.id !== book.id)
      .slice(0, 4);

    /* Get reviews */
    const rawReviews = store.getReviewsByBook(String(book.id));
    const activeReviews = rawReviews.filter(r => r.status !== 'rejected' && r.status !== 'pending');
    let dynamicRating = book.rating;
    let dynamicReviewCount = book.review_count;
    if (activeReviews.length > 0) {
      dynamicReviewCount = activeReviews.length;
      dynamicRating = Number((activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length).toFixed(1));
    }
    const enrichedBook = { ...book, rating: dynamicRating, review_count: dynamicReviewCount };

    const reviews = activeReviews.map(r => {
      const u = store.findUserById(r.user_id);
      return { ...r, user_name: u?.display_name || 'Reader', is_verified_purchase: true };
    });

    res.json({ data: enrichedBook, related, reviews });
  } catch (err) { next(err); }
});

/* GET /api/books/:id/preview – Ebook preview excerpt */
router.get('/:id/preview', async (req, res, next) => {
  try {
    const books = await listBooks();
    const book = books.find(b => String(b.id) === String(req.params.id));
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const preview = getBookPreview(book.id);

    res.json({
      data: {
        bookId: String(book.id),
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        price: book.price,
        category: book.category,
        ...preview,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
