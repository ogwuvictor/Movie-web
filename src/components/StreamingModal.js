import React, { useEffect } from 'react';
import StreamingPlayback from './StreamingPlayback';

// Reuse the site's existing Bootstrap modal and player styles.
export default function StreamingModal({ selection, title, runtimeMinutes, availableServerIds, onClose }) {
  useEffect(() => {
    const phones = window.matchMedia('(max-width: 575.98px), (orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
    const previousOverflow = document.body.style.overflow;
    const updateScrollLock = () => { document.body.style.overflow = phones.matches ? 'hidden' : previousOverflow; };
    updateScrollLock();
    phones.addEventListener('change', updateScrollLock);
    return () => {
      phones.removeEventListener('change', updateScrollLock);
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return <div className="modal fade show d-block streaming-modal" tabIndex="-1"
    role="dialog" aria-modal="true" aria-label={`Watch now: ${title}`}
    style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000000 }} onClick={onClose}>
    <div className="modal-dialog modal-dialog-centered modal-lg" onClick={event => event.stopPropagation()}>
      <div className="modal-content bg-dark text-white">
        <div className="modal-header border-secondary">
          <h5 className="modal-title"><i className="fas fa-play me-2"></i>Watch "{title}"</h5>
          <button type="button" className="btn-close btn-close-white" aria-label="Close player" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          {Number.isFinite(runtimeMinutes) && runtimeMinutes > 0 && <p className="text-secondary streaming-runtime">
            Movie runtime (TMDB): {Math.floor(runtimeMinutes / 60)}h {runtimeMinutes % 60}m
          </p>}
          <StreamingPlayback selection={selection} title={title} availableServerIds={availableServerIds} />
        </div>
      </div>
    </div>
  </div>;
}
