import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES } from '../contexts/ThemeContext.jsx';
import { Palette, Check } from 'lucide-react';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const currentThemeObj = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="icon-btn"
        aria-label={`Change theme, currently ${currentThemeObj.name}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={`Theme: ${currentThemeObj.name}`}
        style={{
          border: '1px solid var(--line, #dcdacf)',
          background: 'var(--card-bg, transparent)',
          color: 'var(--ink, inherit)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Palette size={17} />
        {/* Tiny preview pip in bottom-right */}
        <span
          style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: currentThemeObj.accent,
            border: '1.5px solid var(--card-bg, #fff)',
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select website theme"
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '240px',
            background: 'var(--dropdown-bg, #faf9f4)',
            border: '1px solid var(--line, #dcdacf)',
            borderRadius: '6px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            padding: '10px 8px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: '4px 10px 8px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--muted, #777b70)',
              fontWeight: 700,
              borderBottom: '1px solid var(--line, #ece9dd)',
              marginBottom: '6px',
            }}
          >
            Select Visual Theme
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--green, #254f3b)' : '1px solid transparent',
                    background: isSelected ? 'rgba(128,128,128,0.1)' : 'transparent',
                    color: 'var(--ink, #24392c)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    width: '100%',
                    font: "12px 'DM Sans', sans-serif",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {/* Swatch Preview: Dual circle */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: t.bg,
                      border: `2px solid ${t.accent}`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: t.accent,
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', lineHeight: 1.2 }}>{t.name}</div>
                  </div>

                  {isSelected && (
                    <Check size={14} style={{ color: 'var(--green, #254f3b)', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
