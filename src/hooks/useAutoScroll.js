import { useEffect, useId, useRef, useState } from 'react';

/**
 * Custom hook for auto-scrolling horizontal movie rows
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.scrollInterval - Time between scrolls in milliseconds (default: 4000)
 * @param {number} options.scrollAmount - Amount to scroll in pixels (default: 200)
 * @param {boolean} options.enabled - Enable/disable auto-scroll (default: true)
 * @returns {Object} - Ref for the scroll container and control functions
 */
const useAutoScroll = ({ 
  scrollInterval = 4000, 
  scrollAmount = 200,
  enabled = true 
} = {}) => {
  const scrollContainerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const isUserScrolling = useRef(false);
  const userScrollTimeoutRef = useRef(null);
  const touchTimeoutRef = useRef(null);
  const rowId = useId();
  // Stable per-row timing: spread the first movements and subsequent cadence.
  const seed = Array.from(rowId).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const phase = seed % 3100;
  const cadence = scrollInterval + ((seed >>> 8) % 1900);

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const scroll = () => {
      // On phones, leave browsing under the visitor's touch control.
      if (window.matchMedia('(max-width: 575.98px)').matches) return;
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (isPaused || isUserScrolling.current) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;
      const currentScrollLeft = container.scrollLeft;

      // If we've reached the end, reset to start
      if (currentScrollLeft >= maxScrollLeft) {
        container.scrollTo({
          left: 0,
          behavior: 'smooth'
        });
      } else {
        // Scroll by the specified amount
        const nextScrollLeft = Math.min(currentScrollLeft + scrollAmount, maxScrollLeft);
        container.scrollTo({
          left: nextScrollLeft,
          behavior: 'smooth'
        });
      }
    };

    // Start auto-scroll interval
    const firstScroll = setTimeout(() => {
      scroll();
      intervalRef.current = setInterval(scroll, cadence);
    }, scrollInterval + phase);

    // Cleanup on unmount
    return () => {
      clearTimeout(firstScroll);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [scrollInterval, scrollAmount, enabled, isPaused, phase, cadence]);

  useEffect(() => () => {
    clearTimeout(touchTimeoutRef.current);
    clearTimeout(userScrollTimeoutRef.current);
  }, []);

  // Handle user manual scroll
  const handleUserScroll = () => {
    isUserScrolling.current = true;
    
    // Clear existing timeout
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    // Resume auto-scroll after user stops scrolling for 2 seconds
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 2000);
  };

  // Handle mouse enter (pause)
  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  // Handle mouse leave (resume)
  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  // Handle touch start (pause for mobile)
  const handleTouchStart = () => {
    clearTimeout(touchTimeoutRef.current);
    setIsPaused(true);
  };

  // Handle touch end (resume after delay)
  const handleTouchEnd = () => {
    touchTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2000);
  };

  return {
    scrollContainerRef,
    isPaused,
    handleUserScroll,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false)
  };
};

export default useAutoScroll;
