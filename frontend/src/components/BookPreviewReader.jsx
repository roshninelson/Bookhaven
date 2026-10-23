import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api.js';
import { money } from './BookCard.jsx';
import {
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

const FONT_SIZES = [
  { label: 'A-', size: 14, line: 1.7 },
  { label: 'A', size: 16, line: 1.8 },
  { label: 'A+', size: 19, line: 1.85 },
  { label: 'A++', size: 22, line: 1.9 },
];

export default function BookPreviewReader({ isOpen, onClose, book, onAddToCart }) {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fontIdx, setFontIdx] = useState(1); // Default: 16px
  const [isFinished, setIsFinished] = useState(false);

  // Touch gesture state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  // Lock body scroll while reader is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load preview data from backend
  useEffect(() => {
    async function loadPreview() {
      if (!isOpen || !book) return;
      try {
        setLoading(true);
        setIsFinished(false);
        setCurrentPage(1);
        const res = await api.fetchBookPreview(book.id);
        if (res.data) {
          setPreviewData(res.data);
        }
      } catch (err) {
        console.error('Failed to load book preview:', err);
        setPreviewData({
          has_preview: false,
          message: 'Preview could not be loaded at this time.',
          pages: [],
          total_pages: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [isOpen, book]);

  const totalPages = previewData?.pages?.length || 0;
  const hasPages = previewData?.has_preview && totalPages > 0;

  // Page navigation handlers
  const handleNextPage = useCallback(() => {
    if (!hasPages) return;
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentPage, totalPages, hasPages]);

  const handlePrevPage = useCallback(() => {
    if (isFinished) {
      setIsFinished(false);
      return;
    }
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage, isFinished]);

  // Keyboard navigation: Left/Right arrows and Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNextPage, handlePrevPage, onClose]);

  // Touch Swipe Handlers
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }

  function handleTouchEnd() {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;

    // Minimum swipe threshold: 50px horizontally, and more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // Swipe Left -> Next Page
        handleNextPage();
      } else {
        // Swipe Right -> Previous Page
        handlePrevPage();
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    touchEndY.current = 0;
  }

  if (!isOpen) return null;

  const currentFontSize = FONT_SIZES[fontIdx];
  const activePageObj = hasPages && !isFinished ? previewData.pages[currentPage - 1] : null;

  // Calculate progress percentage
  const progressPercent = hasPages
    ? isFinished
      ? 100
      : Math.round((currentPage / (totalPages + 1)) * 100)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${book?.title || 'Book'}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'reader-fade-in 0.2s ease-out',
      }}
    >
      {/* Container Box */}
      <div
        style={{
          width: 'min(860px, 100%)',
          height: 'min(780px, 94vh)',
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--line, #e2ded5)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Reader Top Bar */}
        <header
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--line, #e5e2d8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--topbar-bg, #faf9f5)',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted, #777b70)', fontWeight: 700 }}>
              Sample Reader Preview
            </div>
            <h2
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '16px',
                margin: '2px 0 0',
                color: 'var(--ink, #24392c)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {book?.title}
              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted, #777b70)', marginLeft: '6px' }}>
                by {book?.author}
              </span>
            </h2>
          </div>

          {/* Controls: Font Size, Counter & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {hasPages && !isFinished && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--chip-bg, #f3f0e6)',
                  borderRadius: '4px',
                  border: '1px solid var(--line, #e0ded3)',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  disabled={fontIdx === 0}
                  onClick={() => setFontIdx((prev) => Math.max(0, prev - 1))}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: fontIdx === 0 ? 'var(--muted, #aaa)' : 'var(--ink, #24392c)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    cursor: fontIdx === 0 ? 'not-allowed' : 'pointer',
                    borderRadius: '2px',
                  }}
                  title="Decrease font size"
                  aria-label="Decrease font size"
                >
                  A-
                </button>
                <button
                  type="button"
                  disabled={fontIdx === FONT_SIZES.length - 1}
                  onClick={() => setFontIdx((prev) => Math.min(FONT_SIZES.length - 1, prev + 1))}
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: fontIdx === FONT_SIZES.length - 1 ? 'var(--muted, #aaa)' : 'var(--ink, #24392c)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    cursor: fontIdx === FONT_SIZES.length - 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '2px',
                  }}
                  title="Increase font size"
                  aria-label="Increase font size"
                >
                  A+
                </button>
              </div>
            )}

            {hasPages && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--muted, #677163)',
                  padding: '4px 10px',
                  background: 'var(--chip-bg, #f3f0e6)',
                  borderRadius: '12px',
                }}
              >
                {isFinished ? 'Preview Complete' : `Page ${currentPage} of ${totalPages}`}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="icon-btn"
              style={{ width: '32px', height: '32px', color: 'var(--ink, #24392c)' }}
              title="Close reader (Esc)"
              aria-label="Close reader"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Reading Progress Line */}
        <div style={{ height: '3px', background: 'var(--line, #e2ded5)', width: '100%', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'var(--green, #254f3b)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Reader Body / Page Content Area */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 8% 40px',
            background: 'var(--paper, #faf8f4)',
            color: 'var(--ink, #24392c)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isFinished || !hasPages ? 'center' : 'flex-start',
            alignItems: isFinished || !hasPages ? 'center' : 'stretch',
            userSelect: 'text',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted, #777b70)' }}>
              <BookOpen size={36} style={{ animation: 'pulse 1.5s infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '13px' }}>Turning the digital page...</p>
            </div>
          ) : !hasPages ? (
            /* Empty / Preview Coming Soon State */
            <div style={{ textAlign: 'center', maxWidth: '440px', margin: '0 auto', padding: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--chip-bg, #f3f0e6)',
                  color: 'var(--green, #254f3b)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <BookOpen size={28} />
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', margin: '0 0 10px', color: 'var(--ink, #24392c)' }}>
                Preview Coming Soon
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted, #777b70)', lineHeight: 1.7, marginBottom: '24px' }}>
                An official digital reading excerpt for <em>"{book?.title}"</em> is currently being curated for our sanctuary. You can acquire the complete volume below.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    onAddToCart(book);
                    onClose();
                  }}
                  style={{ gap: '8px', fontSize: '11px' }}
                >
                  <ShoppingBag size={14} /> Add to Bag ({money(book?.price)})
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={onClose}
                  style={{ fontSize: '11px' }}
                >
                  Back to Details
                </button>
              </div>
            </div>
          ) : isFinished ? (
            /* ── End-of-Preview Purchase Call to Action Screen ── */
            <div
              style={{
                textAlign: 'center',
                maxWidth: '480px',
                margin: '0 auto',
                animation: 'reader-fade-in 0.3s ease',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: 'var(--chip-bg, #f3f0e6)',
                  color: 'var(--green, #254f3b)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '16px',
                }}
              >
                <Sparkles size={13} /> You've reached the end of the preview
              </div>

              {book?.cover_url && (
                <div style={{ marginBottom: '16px' }}>
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    style={{
                      height: '140px',
                      objectFit: 'contain',
                      borderRadius: '3px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                    }}
                  />
                </div>
              )}

              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', margin: '0 0 6px', color: 'var(--ink, #24392c)' }}>
                {book?.title}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted, #777b70)', margin: '0 0 16px' }}>
                by <strong style={{ color: 'var(--ink, #24392c)' }}>{book?.author}</strong>
              </p>

              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--green, #254f3b)',
                  marginBottom: '18px',
                }}
              >
                {money(book?.price)}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted, #777b70)', lineHeight: 1.7, marginBottom: '28px' }}>
                Enjoying the narrative? Continue your journey with the full edition, delivered directly to your doorstep with collector-grade packaging.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    onAddToCart(book);
                    onClose();
                  }}
                  style={{
                    padding: '13px 24px',
                    fontSize: '12px',
                    gap: '8px',
                    width: '100%',
                  }}
                >
                  <ShoppingBag size={15} /> Buy This Book ({money(book?.price)})
                </button>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setIsFinished(false);
                      setCurrentPage(1);
                    }}
                    style={{ flex: 1, fontSize: '11px', gap: '6px' }}
                  >
                    <RotateCcw size={12} /> Read from Beginning
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={onClose}
                    style={{ flex: 1, fontSize: '11px' }}
                  >
                    Return to Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Active Reading Page ── */
            <article
              key={currentPage}
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                width: '100%',
                animation: 'page-flip-in 0.25s ease-out',
              }}
            >
              {activePageObj?.chapter && (
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                  <span
                    style={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      color: 'var(--muted, #777b70)',
                      fontWeight: 600,
                    }}
                  >
                    {activePageObj.chapter}
                  </span>
                  <div
                    style={{
                      width: '40px',
                      height: '1px',
                      background: 'var(--line, #e2ded5)',
                      margin: '10px auto 0',
                    }}
                  />
                </div>
              )}

              <div
                className="reader-page-text"
                style={{
                  fontSize: `${currentFontSize.size}px`,
                  lineHeight: currentFontSize.line,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  color: 'var(--ink, #24392c)',
                  whiteSpace: 'pre-line',
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                }}
              >
                {activePageObj?.text}
              </div>
            </article>
          )}
        </div>

        {/* Reader Footer Navigation */}
        {hasPages && (
          <footer
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--line, #e5e2d8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--topbar-bg, #faf9f5)',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              disabled={currentPage === 1 && !isFinished}
              onClick={handlePrevPage}
              className="secondary-btn"
              style={{
                padding: '8px 16px',
                fontSize: '11px',
                gap: '6px',
                opacity: currentPage === 1 && !isFinished ? 0.4 : 1,
                cursor: currentPage === 1 && !isFinished ? 'not-allowed' : 'pointer',
              }}
              title="Previous page (Left arrow or swipe right)"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <div style={{ fontSize: '11px', color: 'var(--muted, #858b80)', textAlign: 'center' }}>
              <span className="reader-hint" style={{ opacity: 0.8 }}>
                Swipe or use arrow keys ← →
              </span>
            </div>

            {isFinished ? (
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  onAddToCart(book);
                  onClose();
                }}
                style={{ padding: '8px 18px', fontSize: '11px', gap: '6px' }}
              >
                <ShoppingBag size={14} /> Buy Book
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextPage}
                className="primary-btn"
                style={{
                  padding: '8px 18px',
                  fontSize: '11px',
                  gap: '6px',
                }}
                title={currentPage === totalPages ? 'Complete preview' : 'Next page (Right arrow or swipe left)'}
                aria-label="Next page"
              >
                {currentPage === totalPages ? 'Finish Preview' : 'Next'} <ChevronRight size={16} />
              </button>
            )}
          </footer>
        )}
      </div>

      <style>{`
        @keyframes reader-fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes page-flip-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
