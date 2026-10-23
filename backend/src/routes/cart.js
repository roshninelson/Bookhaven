import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { store } from '../lib/store.js';
import { demoBooks, listBooks } from '../lib/books.js';

const router = Router();

/* GET /api/cart */
router.get('/', authenticate, async (req, res) => {
  try {
    const cartItems = store.getCart(req.user.id);
    const allBooks = await listBooks();
    const items = cartItems.map(ci => {
      const book = allBooks.find(b => String(b.id) === String(ci.bookId));
      return book ? { ...ci, book } : null;
    }).filter(Boolean);
    res.json({ data: items });
  } catch (err) {
    res.status(500).json({ error: 'Could not load cart' });
  }
});

/* POST /api/cart – add item */
router.post('/', authenticate, async (req, res) => {
  try {
    const { bookId, qty = 1 } = req.body || {};
    if (!bookId) return res.status(400).json({ error: 'bookId is required' });
    const quantity = Math.max(1, Math.min(99, Number(qty) || 1));

    const allBooks = await listBooks();
    const book = allBooks.find(b => String(b.id) === String(bookId));
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.stock < 1) return res.status(400).json({ error: 'Book is out of stock' });

    const cart = store.getCart(req.user.id);
    const existing = cart.find(i => i.bookId === String(bookId));
    if (existing) {
      existing.qty = Math.min(existing.qty + quantity, book.stock);
    } else {
      cart.push({ bookId: String(bookId), qty: Math.min(quantity, book.stock) });
    }
    store.setCart(req.user.id, cart);
    res.json({ data: cart, message: `${book.title} added to cart` });
  } catch (err) {
    res.status(500).json({ error: 'Could not update cart' });
  }
});

/* PUT /api/cart/:bookId – update quantity */
router.put('/:bookId', authenticate, async (req, res) => {
  try {
    const { qty } = req.body || {};
    if (qty === undefined) return res.status(400).json({ error: 'qty is required' });
    const quantity = Number(qty);

    const cart = store.getCart(req.user.id);
    if (quantity <= 0) {
      store.setCart(req.user.id, cart.filter(i => i.bookId !== req.params.bookId));
    } else {
      const allBooks = await listBooks();
      const book = allBooks.find(b => String(b.id) === String(req.params.bookId));
      const maxQty = book ? book.stock : 99;
      const item = cart.find(i => i.bookId === req.params.bookId);
      if (item) item.qty = Math.min(quantity, maxQty);
    }
    res.json({ data: store.getCart(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: 'Could not update cart' });
  }
});

/* DELETE /api/cart/:bookId */
router.delete('/:bookId', authenticate, (req, res) => {
  const cart = store.getCart(req.user.id).filter(i => i.bookId !== req.params.bookId);
  store.setCart(req.user.id, cart);
  res.json({ data: cart });
});

/* POST /api/cart/merge – merge guest cart on login */
router.post('/merge', authenticate, async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const allBooks = await listBooks();
    const cart = store.getCart(req.user.id);
    for (const gi of items) {
      const book = allBooks.find(b => String(b.id) === String(gi.bookId || gi.id));
      if (!book || book.stock < 1) continue;
      const existing = cart.find(i => i.bookId === String(book.id));
      if (existing) {
        existing.qty = Math.min(existing.qty + (gi.qty || 1), book.stock);
      } else {
        cart.push({ bookId: String(book.id), qty: Math.min(gi.qty || 1, book.stock) });
      }
    }
    store.setCart(req.user.id, cart);
    res.json({ data: cart });
  } catch (err) {
    res.status(500).json({ error: 'Could not merge cart' });
  }
});

export default router;
