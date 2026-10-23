import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import * as api from '../services/api.js';
import AuthModal from '../components/AuthModal.jsx';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle,
  Clock,
  Sparkles,
  Trash2,
  Trophy,
  Edit2,
  Check,
} from 'lucide-react';

export default function ReadingListPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const currentYear = new Date().getFullYear();

  const [readingList, setReadingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [authOpen, setAuthOpen] = useState(false);

  // Dynamic Reading Milestone state
  const [milestone, setMilestone] = useState({
    year: currentYear,
    completed: 0,
    goal: 24,
    percent: 0,
    isGoalReached: false,
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(24);

  useEffect(() => {
    async function loadShelfAndMilestone() {
      try {
        setLoading(true);
        const [shelfRes, milestoneRes] = await Promise.all([
          api.fetchReadingList(),
          api.fetchMilestone(currentYear),
        ]);
        if (shelfRes.data) setReadingList(shelfRes.data);
        if (milestoneRes.data) {
          setMilestone(milestoneRes.data);
          setGoalInput(milestoneRes.data.goal || 24);
        }
      } catch (err) {
        console.error('Failed to load bookshelf data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) loadShelfAndMilestone();
    else setLoading(false);
  }, [user, currentYear]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', maxWidth: '440px', margin: '0 auto' }}>
        <Bookmark size={42} style={{ color: 'var(--green, #254f3b)', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '30px', color: 'var(--ink, #24392c)' }}>
          Your Personal Bookshelf
        </h2>
        <p style={{ color: 'var(--muted, #777b70)', fontSize: '13px', margin: '14px 0 24px', lineHeight: 1.6 }}>
          Track books you're actively reading, set annual reading milestones, and organize your literary journey.
        </p>
        <button className="primary-btn" onClick={() => setAuthOpen(true)}>
          Sign In to Access Bookshelf
        </button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  async function handleUpdateStatus(bookId, newStatus) {
    try {
      const res = await api.updateReadingListItem(bookId, { status: newStatus });
      setReadingList((prev) =>
        prev.map((i) =>
          String(i.bookId || i.book_id) === String(bookId)
            ? { ...i, status: newStatus === 'finished' ? 'completed' : newStatus }
            : i
        )
      );
      if (res.milestone) {
        setMilestone(res.milestone);
      }
      const label = newStatus.replace(/_/g, ' ');
      addToast(`Book marked as ${label}`, 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  }

  async function handleUpdateProgress(bookId, currentPage, totalPages = 300) {
    try {
      await api.updateReadingListItem(bookId, { current_page: currentPage, total_pages: totalPages });
      setReadingList((prev) =>
        prev.map((i) =>
          String(i.bookId || i.book_id) === String(bookId)
            ? { ...i, current_page: currentPage, total_pages: totalPages }
            : i
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemove(bookId) {
    try {
      const res = await api.removeFromReadingList(bookId);
      setReadingList((prev) =>
        prev.filter((i) => String(i.bookId || i.book_id) !== String(bookId))
      );
      if (res.milestone) {
        setMilestone(res.milestone);
      }
      addToast('Book removed from bookshelf', 'info');
    } catch (err) {
      addToast('Failed to remove book', 'error');
    }
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    const val = Number(goalInput);
    if (isNaN(val) || val < 1 || val > 1000) {
      addToast('Please enter a goal between 1 and 1000', 'error');
      return;
    }
    try {
      const res = await api.updateReadingGoal(val, currentYear);
      if (res.data) {
        setMilestone(res.data);
        setEditingGoal(false);
        addToast(`Annual reading goal updated to ${val} books!`, 'success');
      }
    } catch (err) {
      addToast('Failed to update reading goal', 'error');
    }
  }

  const completedCount = readingList.filter((b) => b.status === 'completed' || b.status === 'finished').length;
  const currentlyReadingCount = readingList.filter((b) => b.status === 'reading').length;
  const wantToReadCount = readingList.filter((b) => b.status === 'want_to_read').length;

  const filteredItems = readingList.filter((item) => {
    if (activeTab === 'reading') return item.status === 'reading';
    if (activeTab === 'want_to_read') return item.status === 'want_to_read';
    if (activeTab === 'completed') return item.status === 'completed' || item.status === 'finished';
    return true;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 5% 80px' }}>
      {/* Header and Annual Goal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '8px' }}>
            <span className="eyebrow-line" /> PERSONAL READING SANCTUARY
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '38px', margin: '0 0 8px', color: 'var(--ink, #24392c)' }}>
            {user.display_name ? `${user.display_name}'s Shelf` : 'My Bookshelf'}
          </h1>
          <p style={{ color: 'var(--muted, #777b70)', fontSize: '13px', margin: 0 }}>
            {readingList.length} volumes in your personal sanctuary.
          </p>
        </div>

        {/* Milestone Goal Card (Dynamic, styled per screenshot reference) */}
        <div
          style={{
            background: 'var(--milestone-bg, #e9eee4)',
            border: '1px solid var(--milestone-border, #d4decb)',
            borderRadius: '8px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--trophy-bg, #254f3b)',
              color: 'var(--trophy-color, #d5e58d)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Trophy size={26} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted, #556950)', fontWeight: 700 }}>
                {milestone.year} READING MILESTONE
              </div>
              <button
                type="button"
                onClick={() => setEditingGoal(!editingGoal)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '10px',
                  color: 'var(--muted, #556950)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
                title="Edit annual goal"
              >
                <Edit2 size={11} /> {editingGoal ? 'Close' : 'Set Goal'}
              </button>
            </div>

            {editingGoal ? (
              <form onSubmit={handleSaveGoal} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 8px' }}>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  style={{
                    width: '65px',
                    padding: '3px 8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid var(--line, #d4decb)',
                    background: 'var(--card-bg, #fff)',
                    color: 'var(--ink, #24392c)',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--muted, #556950)' }}>books in {milestone.year}</span>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ padding: '3px 10px', fontSize: '11px', height: '26px' }}
                >
                  Save
                </button>
              </form>
            ) : (
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink, #24392c)', margin: '2px 0 6px' }}>
                {milestone.completed} of {milestone.goal} books read
              </div>
            )}

            {/* Horizontal Progress Bar */}
            <div
              style={{
                background: 'var(--milestone-progress-track, #d5ded0)',
                height: '7px',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
              }}
              role="progressbar"
              aria-valuenow={milestone.completed}
              aria-valuemin="0"
              aria-valuemax={milestone.goal}
            >
              <div
                style={{
                  background: 'var(--green, #254f3b)',
                  height: '100%',
                  width: `${milestone.percent}%`,
                  transition: 'width 0.4s ease',
                  borderRadius: '4px',
                }}
              />
            </div>

            {milestone.isGoalReached && (
              <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--green, #254f3b)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} /> Goal achieved! Outstanding reading journey this year.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line, #e5e2d8)', paddingBottom: '14px', marginBottom: '28px' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={activeTab === 'all' ? 'category-chip active' : 'category-chip'}
        >
          All Volumes ({readingList.length})
        </button>
        <button
          onClick={() => setActiveTab('reading')}
          className={activeTab === 'reading' ? 'category-chip active' : 'category-chip'}
        >
          Currently Reading ({currentlyReadingCount})
        </button>
        <button
          onClick={() => setActiveTab('want_to_read')}
          className={activeTab === 'want_to_read' ? 'category-chip active' : 'category-chip'}
        >
          Want to Read ({wantToReadCount})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={activeTab === 'completed' ? 'category-chip active' : 'category-chip'}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Shelf List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted, #777b70)' }}>
          <BookOpen size={32} style={{ animation: 'pulse 1.5s infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '12px' }}>Loading your bookshelf...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={36} />
          <h3>This shelf is waiting for a title</h3>
          <p>Purchased books are added automatically, or explore our catalogue to save titles.</p>
          <Link to="/catalog" className="primary-btn" style={{ marginTop: '16px' }}>
            Discover Books <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredItems.map((item) => {
            const book = item.book || { title: 'Unknown Title', author: 'Author' };
            const bookId = item.bookId || item.book_id;
            const isCompleted = item.status === 'completed' || item.status === 'finished';

            return (
              <div
                key={item.id || bookId}
                style={{
                  background: 'var(--card-bg, #faf9f5)',
                  border: '1px solid var(--line, #e5e2d8)',
                  borderRadius: '6px',
                  padding: '20px',
                  display: 'flex',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <Link to={`/books/${bookId}`}>
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    style={{ width: '75px', height: '110px', objectFit: 'contain', background: '#eeece2', borderRadius: '3px' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </Link>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', margin: '0 0 4px', color: 'var(--ink, #24392c)' }}>
                      <Link to={`/books/${bookId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {book.title}
                      </Link>
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--muted, #777b70)', marginBottom: '10px' }}>
                      by {book.author}
                    </div>

                    {/* Progress Slider if reading */}
                    {item.status === 'reading' && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted, #556050)', marginBottom: '4px' }}>
                          <span>Page {item.current_page || 0} of {item.total_pages || 320}</span>
                          <b>{Math.round(((item.current_page || 0) / (item.total_pages || 320)) * 100)}%</b>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={item.total_pages || 320}
                          value={item.current_page || 0}
                          onChange={(e) => handleUpdateProgress(bookId, Number(e.target.value), item.total_pages || 320)}
                          style={{ width: '100%', accentColor: 'var(--green, #254f3b)', cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={isCompleted ? 'completed' : item.status}
                      onChange={(e) => handleUpdateStatus(bookId, e.target.value)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--line, #dcdacf)',
                        background: 'var(--card-bg, #fff)',
                        cursor: 'pointer',
                        color: 'var(--ink, #254f3b)',
                        fontWeight: 600,
                      }}
                    >
                      <option value="want_to_read">Want to read</option>
                      <option value="reading">Currently reading</option>
                      <option value="completed">Completed ✓</option>
                    </select>

                    <button
                      onClick={() => handleRemove(bookId)}
                      className="icon-btn"
                      style={{ width: '28px', height: '28px', color: 'var(--muted, #979a8e)', marginLeft: 'auto' }}
                      title="Remove from shelf"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
