import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Keep browsing positions across SPA navigation, including the explicit Home link.
export default function useRouteScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());

  useLayoutEffect(() => {
    const path = location.pathname + location.search;
    const target = navigationType === 'POP' || location.pathname === '/'
      ? positions.current.get(path) : null;
    let restoring = Boolean(target);
    let frame;
    let observer;
    let resizeObserver;
    let timeout;
    const rows = () => Array.from(document.querySelectorAll('.movie-row'));
    const save = () => {
      if (restoring) return;
      const entries = positions.current;
      entries.set(path, { x: window.scrollX, y: window.scrollY, rows: rows().map(row => row.scrollLeft) });
      // Bound memory for long browsing sessions.
      if (entries.size > 100) entries.delete(entries.keys().next().value);
    };
    const stop = () => {
      restoring = false;
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
      const currentRows = rows();
      target.rows.forEach((left, index) => {
        currentRows[index]?.scrollTo({ left, behavior: 'instant' });
      });
      const ready = Math.abs(window.scrollY - target.y) < 2 &&
        target.rows.every((left, index) => !left || Math.abs((currentRows[index]?.scrollLeft ?? -1) - left) < 2);
      if (ready) stop();
    };
    const schedule = () => {
      if (!restoring) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(restore);
    };
    if (target) {
      // Lists and poster images arrive asynchronously after Home remounts.
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(document.body);
      }
      timeout = window.setTimeout(stop, 8000);
      restore();
    } else {
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
    const previousMode = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.addEventListener('scroll', save, true);
    document.addEventListener('click', save, true);
    document.addEventListener('load', schedule, true);
    // Stop retries immediately when the visitor takes control of scrolling.
    const interactions = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    interactions.forEach(event => window.addEventListener(event, stop, { passive: true }));
    return () => {
      stop();
      window.history.scrollRestoration = previousMode;
      window.removeEventListener('scroll', save, true);
      document.removeEventListener('click', save, true);
      document.removeEventListener('load', schedule, true);
      interactions.forEach(event => window.removeEventListener(event, stop));
    };
  }, [location.key, location.pathname, location.search, navigationType]);
}
