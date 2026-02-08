import { useRef, useCallback, useEffect } from 'react';

interface SwipeNavigationOptions {
  /** Reference to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Width of each column in pixels */
  columnWidth: number;
  /** Minimum swipe distance to trigger navigation (default: 50px) */
  threshold?: number;
  /** Minimum swipe velocity to trigger navigation (px/ms, default: 0.3) */
  velocityThreshold?: number;
  /** Enable/disable the swipe navigation */
  enabled?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  startScrollLeft: number;
  isSwiping: boolean;
  isHorizontal: boolean | null;
}

export function useSwipeNavigation({
  containerRef,
  columnWidth,
  threshold = 50,
  velocityThreshold = 0.3,
  enabled = true,
}: SwipeNavigationOptions) {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    startScrollLeft: 0,
    isSwiping: false,
    isHorizontal: null,
  });

  const getCurrentColumnIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    return Math.round(el.scrollLeft / columnWidth);
  }, [containerRef, columnWidth]);

  const scrollToColumn = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (!el) return;

    const maxIndex = Math.floor((el.scrollWidth - el.clientWidth) / columnWidth);
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    
    el.scrollTo({
      left: clampedIndex * columnWidth,
      behavior,
    });
  }, [containerRef, columnWidth]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const el = containerRef.current;
    if (!el || !touch) return;

    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      startScrollLeft: el.scrollLeft,
      isSwiping: true,
      isHorizontal: null,
    };
  }, [containerRef, enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchState.current.isSwiping) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;

    // Determine direction on first significant move
    if (touchState.current.isHorizontal === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        touchState.current.isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    // If vertical scroll, don't interfere
    if (touchState.current.isHorizontal === false) {
      touchState.current.isSwiping = false;
      return;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchState.current.isSwiping) return;

    const el = containerRef.current;
    if (!el) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchState.current.startX;
    const deltaTime = Date.now() - touchState.current.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    const currentIndex = getCurrentColumnIndex();
    
    // Check if swipe was fast enough or far enough
    const isQuickSwipe = velocity >= velocityThreshold && Math.abs(deltaX) > 20;
    const isLongSwipe = Math.abs(deltaX) >= threshold;

    if (touchState.current.isHorizontal && (isQuickSwipe || isLongSwipe)) {
      if (deltaX > 0) {
        // Swiped right - go to previous column
        scrollToColumn(currentIndex - 1);
      } else {
        // Swiped left - go to next column
        scrollToColumn(currentIndex + 1);
      }
    } else {
      // Snap to nearest column
      scrollToColumn(currentIndex);
    }

    // Reset state
    touchState.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      startScrollLeft: 0,
      isSwiping: false,
      isHorizontal: null,
    };
  }, [containerRef, enabled, getCurrentColumnIndex, scrollToColumn, threshold, velocityThreshold]);

  const handleTouchCancel = useCallback(() => {
    touchState.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      startScrollLeft: 0,
      isSwiping: false,
      isHorizontal: null,
    };
  }, []);

  // Attach touch event listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    // Only enable on mobile (check for touch capability and screen width)
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [containerRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return {
    scrollToColumn,
    getCurrentColumnIndex,
  };
}
