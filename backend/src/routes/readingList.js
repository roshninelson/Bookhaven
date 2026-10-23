import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { store } from '../lib/store.js';
import { listBooks } from '../lib/books.js';

const router = Router();

/* GET /api/reading-list/milestone */
router.get('/milestone', authenticate, (req, res) => {
  const currentYear = new Date().getFullYear();
  const year = req.query.year ? Number(req.query.year) : currentYear;
  const milestone = store.getReadingMilestone(req.user.id, year);
  res.json({ data: milestone });
});

/* PUT /api/reading-list/goal */
router.put('/goal', authenticate, (req, res) => {
  const { goal, year } = req.body || {};
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const numericGoal = Number(goal);
  if (isNaN(numericGoal) || numericGoal < 1 || numericGoal > 1000) {
    return res.status(400).json({ error: 'Reading goal must be between 1 and 1000' });
  }
  const milestone = store.setReadingGoal(req.user.id, targetYear, numericGoal);
  res.json({ data: milestone, message: `Reading goal updated to ${numericGoal} books` });
});

/* GET /api/reading-list */
router.get('/', authenticate, async (req, res) => {
  try {
    const list = store.getReadingList(req.user.id);
    const allBooks = await listBooks();
    const enriched = list.map(item => {
      const book = allBooks.find(b => String(b.id) === String(item.bookId));
      return book ? { ...item, book } : null;
    }).filter(Boolean);
    res.json({ data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reading list' });
  }
});

/* POST /api/reading-list */
router.post('/', authenticate, (req, res) => {
  const { bookId } = req.body || {};
  if (!bookId) return res.status(400).json({ error: 'bookId is required' });
  store.addToReadingList(req.user.id, String(bookId));
  res.json({ data: store.getReadingList(req.user.id) });
});

/* PUT /api/reading-list/:bookId */
router.put('/:bookId', authenticate, (req, res) => {
  const { status, progress, current_page, total_pages } = req.body || {};
  const validStatuses = ['want_to_read', 'reading', 'finished', 'completed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }
  const updates = {};
  if (status) updates.status = status === 'finished' ? 'completed' : status;
  if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, Number(progress)));
  if (current_page !== undefined) updates.current_page = Math.max(0, Number(current_page));
  if (total_pages !== undefined) updates.total_pages = Math.max(1, Number(total_pages));

  const item = store.updateReadingListItem(req.user.id, req.params.bookId, updates);
  if (!item) return res.status(404).json({ error: 'Book not in reading list' });

  const currentYear = new Date().getFullYear();
  const milestone = store.getReadingMilestone(req.user.id, currentYear);
  res.json({ data: item, milestone });
});

/* DELETE /api/reading-list/:bookId */
router.delete('/:bookId', authenticate, (req, res) => {
  store.removeFromReadingList(req.user.id, req.params.bookId);
  const currentYear = new Date().getFullYear();
  const milestone = store.getReadingMilestone(req.user.id, currentYear);
  res.json({ ok: true, milestone });
});

export default router;
