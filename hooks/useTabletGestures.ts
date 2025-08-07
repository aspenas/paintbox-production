import React, { useState, useCallback, useRef } from 'react';

// Simplified swipe navigation hook
export function useSwipeNavigation(handlers: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const bind = () => ({
    onTouchStart: (e: React.TouchEvent) => {
      setStartX(e.touches[0].clientX);
      setStartY(e.touches[0].clientY);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const threshold = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > threshold && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < -threshold && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > threshold && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < -threshold && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }
  });

  return { bind, spring: { x: 0, y: 0 } };
}

// Long press hook
export function useLongPress(
  callback: () => void,
  { delay = 500 } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    timeout.current = setTimeout(() => {
      callback();
      setLongPressTriggered(true);
    }, delay);
  }, [callback, delay]);

  const clear = useCallback(() => {
    timeout.current && clearTimeout(timeout.current);
    setLongPressTriggered(false);
  }, []);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  };
}

// Double tap hook
export function useDoubleTap(
  callback: () => void,
  delay = 300
) {
  const [lastTap, setLastTap] = useState(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    
    if (now - lastTap < delay) {
      callback();
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  }, [callback, delay, lastTap]);

  return {
    onTouchEnd: handleTap,
    onClick: handleTap,
  };
}