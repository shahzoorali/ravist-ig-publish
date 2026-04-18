'use client';

/**
 * PublishToInstagram.jsx
 *
 * Drop into: admin/src/components/  (or wherever your components live)
 *
 * Usage in events/new/page.js or events/[id]/page.js:
 *
 *   import PublishToInstagram from '@/components/PublishToInstagram';
 *
 *   // Show only after event is saved (has an ID)
 *   {savedEventId && (
 *     <PublishToInstagram eventId={savedEventId} />
 *   )}
 *
 * The button opens a modal with:
 *   - Preview of the video/image that will be published
 *   - Editable caption textarea (pre-filled from event data)
 *   - Toggles for Post and/or Story
 *   - Publish button with loading state
 *   - Success state showing link to live Reel
 */

import { useState, useCallback } from 'react';

// ── Adjust this to your actual API base URL ───────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PublishToInstagram({ eventId }) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [loading,   setLoading]   = useState(false);    // 'caption' | 'publish' | false
  const [caption,   setCaption]   = useState('');
  const [videoUrl,  setVideoUrl]  = useState('');
  const [publishPost,  setPublishPost]  = useState(true);
  const [publishStory, setPublishStory] = useState(true);
  const [result,    setResult]    = useState(null);     // success state
  const [error,     setError]     = useState(null);

  // ── Open modal — fetch pre-filled caption ────────────────────────────────────
  const openModal = useCallback(async () => {
    setIsOpen(true);
    setResult(null);
    setError(null);
    setLoading('caption');

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/instagram-caption`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setCaption(data.caption);
      setVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err.message || 'Failed to load caption. Check the backend.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // ── Publish ──────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!caption.trim()) return;
    if (!publishPost && !publishStory) {
      setError('Select at least one: Post or Story.');
      return;
    }

    setLoading('publish');
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/publish-instagram`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ caption, publishPost, publishStory }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError(err.message || 'Publishing failed. Check the microservice logs.');
    } finally {
      setLoading(false);
    }
  }, [caption, publishPost, publishStory, eventId]);

  const closeModal = () => {
    if (loading) return;   // don't close while publishing
    setIsOpen(false);
    setResult(null);
    setError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button — sits alongside "Publish Event" in the form */}
      <button
        type="button"
        onClick={openModal}
        style={styles.triggerBtn}
      >
        <InstagramIcon />
        Publish to Instagram
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                <InstagramIcon size={20} />
                <span>Publish to Instagram</span>
              </div>
              <button onClick={closeModal} style={styles.closeBtn} disabled={!!loading}>✕</button>
            </div>

            {/* Loading caption state */}
            {loading === 'caption' && (
              <div style={styles.loadingBox}>
                <Spinner />
                <span>Loading caption from event data...</span>
              </div>
            )}

            {/* Success state */}
            {result && !loading && (
              <div style={styles.successBox}>
                <div style={styles.successIcon}>✅</div>
                <div style={styles.successText}>
                  <strong>{buildSuccessMsg(result)}</strong>
                </div>
                {result.post?.permalink && (
                  <a
                    href={result.post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.permalinkBtn}
                  >
                    View Reel on Instagram →
                  </a>
                )}
                {result.errors?.length > 0 && (
                  <div style={styles.partialError}>
                    ⚠️ Partial errors: {result.errors.join(', ')}
                  </div>
                )}
                <button onClick={closeModal} style={styles.doneBtn}>Done</button>
              </div>
            )}

            {/* Main form */}
            {!result && loading !== 'caption' && (
              <>
                {/* Toggles */}
                <div style={styles.toggleRow}>
                  <Toggle
                    label="Feed Post (Reel)"
                    checked={publishPost}
                    onChange={setPublishPost}
                    disabled={!!loading}
                  />
                  <Toggle
                    label="Story"
                    checked={publishStory}
                    onChange={setPublishStory}
                    disabled={!!loading}
                  />
                </div>

                {/* Caption textarea */}
                <label style={styles.label}>
                  Caption
                  <span style={styles.labelHint}>Edit before publishing</span>
                </label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  style={styles.textarea}
                  rows={10}
                  disabled={!!loading}
                  placeholder="Caption will appear here..."
                />
                <div style={styles.charCount}>
                  {caption.length}/2200 characters
                  {caption.length > 2200 && (
                    <span style={{ color: '#ef4444', marginLeft: 8 }}>Too long</span>
                  )}
                </div>

                {/* What gets published note */}
                <div style={styles.infoBox}>
                  📹 Publishing the S3-hosted video from this event as a{' '}
                  {publishPost && publishStory ? 'Reel + Story' :
                   publishPost ? 'Reel' : 'Story'}.
                </div>

                {/* Error */}
                {error && <div style={styles.errorBox}>⚠️ {error}</div>}

                {/* Actions */}
                <div style={styles.actions}>
                  <button
                    onClick={closeModal}
                    style={styles.cancelBtn}
                    disabled={!!loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    style={{
                      ...styles.publishBtn,
                      opacity: loading || caption.length > 2200 ? 0.6 : 1,
                    }}
                    disabled={!!loading || caption.length > 2200}
                  >
                    {loading === 'publish' ? (
                      <><Spinner small /> Publishing...</>
                    ) : (
                      <><InstagramIcon size={16} /> Publish Now</>
                    )}
                  </button>
                </div>

                {loading === 'publish' && (
                  <p style={styles.publishingNote}>
                    ⏳ Publishing to Instagram... this can take up to 2 minutes while
                    Instagram processes the video. Do not close this window.
                  </p>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label style={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ marginRight: 8 }}
      />
      {label}
    </label>
  );
}

function Spinner({ small }) {
  return (
    <span style={{
      display: 'inline-block',
      width:  small ? 14 : 24,
      height: small ? 14 : 24,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      marginRight: small ? 6 : 0,
    }} />
  );
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function buildSuccessMsg({ post, story }) {
  const parts = [];
  if (post)  parts.push('Reel published');
  if (story) parts.push('Story published');
  return parts.join(' & ') + ' successfully! 🎉';
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Inline styles — no extra CSS file needed. Adjust to match your design system.

const styles = {
  triggerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 28,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    color: '#fff',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 18, fontWeight: 700,
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#888',
    fontSize: 18, cursor: 'pointer', padding: 4,
  },
  loadingBox: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '20px 0', color: '#aaa',
  },
  toggleRow: {
    display: 'flex', gap: 24, marginBottom: 20,
  },
  toggle: {
    display: 'flex', alignItems: 'center',
    fontSize: 14, color: '#ccc', cursor: 'pointer',
  },
  label: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, fontWeight: 600, color: '#aaa',
    marginBottom: 6,
  },
  labelHint: {
    fontWeight: 400, color: '#666', fontStyle: 'italic',
  },
  textarea: {
    width: '100%', padding: '10px 12px',
    background: '#111', border: '1px solid #333',
    borderRadius: 8, color: '#fff', fontSize: 13,
    lineHeight: 1.6, resize: 'vertical',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },
  charCount: {
    fontSize: 11, color: '#555', textAlign: 'right', marginTop: 4, marginBottom: 14,
  },
  infoBox: {
    background: '#111', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#888', marginBottom: 16,
  },
  errorBox: {
    background: '#2a1010', border: '1px solid #5a1a1a',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#f87171', marginBottom: 16,
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4,
  },
  cancelBtn: {
    padding: '10px 20px', background: 'transparent',
    border: '1px solid #444', borderRadius: 8,
    color: '#aaa', cursor: 'pointer', fontSize: 14,
  },
  publishBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    border: 'none', borderRadius: 8,
    color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  publishingNote: {
    marginTop: 14, fontSize: 12, color: '#666',
    textAlign: 'center', lineHeight: 1.6,
  },
  successBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, padding: '24px 0', textAlign: 'center',
  },
  successIcon: { fontSize: 48 },
  successText: { fontSize: 16, color: '#d1fae5' },
  permalinkBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    borderRadius: 8, color: '#fff', textDecoration: 'none',
    fontWeight: 600, fontSize: 14,
  },
  partialError: {
    fontSize: 12, color: '#fbbf24',
  },
  doneBtn: {
    padding: '10px 28px', background: '#222',
    border: '1px solid #444', borderRadius: 8,
    color: '#aaa', cursor: 'pointer', fontSize: 14,
  },
};
