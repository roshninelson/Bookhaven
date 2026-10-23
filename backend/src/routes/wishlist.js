import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { store } from '../lib/store.js';

const router = Router();

/* GET /api/wishlist */
router.get('/', authenticate, (req, res) => {
  res.json({ data: store.getWishlist(req.user.id) });
});

/* POST /api/wishlist – add item */
router.post('/', authenticate, (req, res) => {
  const { bookId } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId is required' });
  store.addToWishlist(req.user.id, String(bookId));
  res.json({ data: store.getWishlist(req.user.id) });
});

/* DELETE /api/wishlist/:bookId */
router.delete('/:bookId', authenticate, (req, res) => {
  store.removeFromWishlist(req.user.id, req.params.bookId);
  res.json({ data: store.getWishlist(req.user.id) });
});

/* POST /api/wishlist/merge – merge guest wishlist on login */
router.post('/merge', authenticate, (req, res) => {
  const { items = [] } = req.body || {};
  for (const bookId of items) {
    store.addToWishlist(req.user.id, String(bookId));
  }
  res.json({ data: store.getWishlist(req.user.id) });
});

export default router;
