import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart, Sparkles } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.jsx';

export default function Footer() {
  const [email, setEmail] = useState('');
  const { addToast } = useToast();

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;
    addToast('You’re on the list — welcome to the BookHaven book club!', 'success');
    setEmail('');
  }

  return (
    <>
      <section className="newsletter" id="about">
        <div className="newsletter-stamp">
          <BookOpen size={25} />
          <span>
            THE
            <br />
            BOOK CLUB
          </span>
        </div>
        <div className="newsletter-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> LETTERS FROM THE BOOKSHELF
          </div>
          <h2>
            A good story.
            <br />
            <em>Every once in a while.</em>
          </h2>
          <p>Reading recommendations, little literary joys, and new arrivals worth making room for.</p>
        </div>
        <form className="newsletter-form" onSubmit={handleSubscribe}>
          <label htmlFor="newsletter-email">Your email address</label>
          <div className="email-row">
            <input
              id="newsletter-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" aria-label="Subscribe to newsletter">
              <ArrowRight size={19} />
            </button>
          </div>
          <small>No spam, just good stories. Unsubscribe anytime.</small>
        </form>
      </section>

      <footer className="footer">
        <Link to="/" className="brand footer-brand">
          <span className="brand-mark">
            <BookOpen size={19} />
          </span>
          <span>
            bookhaven<span className="brand-dot">.</span>
            <small>YOUR NEXT CHAPTER STARTS HERE</small>
          </span>
        </Link>
        <p>Made for the love of a good book.</p>
        <div className="footer-right">
          <Link to="/catalog">Browse All</Link>
          <Link to="/recommendations">AI Recommendations</Link>
          <Link to="/bookshelf">Bookshelf</Link>
          <span>© 2026 BookHaven Inc.</span>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            Back to top ↑
          </a>
        </div>
      </footer>
    </>
  );
}
