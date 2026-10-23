import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { listBooks } from '../lib/books.js';

const router = Router();

/**
 * POST /api/recommendations
 * Deterministic book recommendation engine.
 * Falls back to catalogue-based matching when no AI API key is configured.
 *
 * Body: { query?: string, budget?: number, genre?: string, preferences?: string[] }
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { query = '', budget, genre, preferences = [] } = req.body || {};
    const allBooks = await listBooks();
    let candidates = allBooks.filter(b => b.stock > 0);

    /* Filter by budget */
    if (budget && Number(budget) > 0) {
      candidates = candidates.filter(b => b.price <= Number(budget));
    }

    /* Filter by genre */
    if (genre) {
      const genreMatch = candidates.filter(b =>
        b.category.toLowerCase() === genre.toLowerCase());
      if (genreMatch.length > 0) candidates = genreMatch;
    }

    /* Score each book based on query relevance */
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = candidates.map(book => {
      let score = book.rating * 10 + (book.featured ? 15 : 0);

      /* Text relevance */
      const searchable = `${book.title} ${book.author} ${book.category} ${book.description}`.toLowerCase();
      for (const word of queryWords) {
        if (searchable.includes(word)) score += 20;
      }

      /* Keyword matching for common themes */
      const themeMap = {
        discipline: ['habits', 'work', 'focus', 'productivity', 'growth'],
        inspiring: ['creative', 'art', 'life', 'meaning', 'purpose', 'growth'],
        fiction: ['fiction', 'novel', 'story', 'library', 'midnight'],
        science: ['sci-fi', 'dune', 'science', 'arrakis'],
        money: ['finance', 'money', 'wealth', 'investing'],
        memoir: ['memoir', 'education', 'family', 'life'],
        happiness: ['happy', 'life', 'ikigai', 'purpose', 'joy'],
        productivity: ['work', 'focus', 'habits', 'productivity'],
      };

      for (const [theme, keywords] of Object.entries(themeMap)) {
        if (query.toLowerCase().includes(theme)) {
          for (const kw of keywords) {
            if (searchable.includes(kw)) score += 10;
          }
        }
      }

      /* Preference matching */
      for (const pref of preferences) {
        if (searchable.includes(pref.toLowerCase())) score += 15;
      }

      return { ...book, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const recommendations = scored.slice(0, 5);

    /* Generate explanations */
    const results = recommendations.map(book => {
      const reasons = [];
      if (budget && book.price <= Number(budget)) {
        reasons.push(`Within your budget of ₹${budget}`);
      }
      if (book.rating >= 4.7) reasons.push(`Highly rated (${book.rating}★)`);
      if (book.featured) reasons.push('Reader favourite');
      if (queryWords.some(w => book.title.toLowerCase().includes(w))) {
        reasons.push('Title matches your search');
      }
      if (queryWords.some(w => book.description.toLowerCase().includes(w))) {
        reasons.push('Description matches your interest');
      }
      if (genre && book.category.toLowerCase() === genre.toLowerCase()) {
        reasons.push(`In the ${book.category} genre you requested`);
      }
      if (reasons.length === 0) reasons.push('Popular pick from our catalogue');

      const { score, ...bookData } = book;
      return { book: bookData, reasons, relevance_score: score };
    });

    res.json({
      data: results,
      engine: 'deterministic',
      note: 'Recommendations are generated from the BookHaven catalogue using text matching and scoring. Connect an AI API key for enhanced natural-language recommendations.',
    });
  } catch (err) {
    console.error('Recommendation error:', err.message);
    res.status(500).json({ error: 'Could not generate recommendations' });
  }
});

export default router;
