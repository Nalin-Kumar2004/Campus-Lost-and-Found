/**
 * DEBOUNCE HOOK - Performance Optimization Pattern
 * =================================================
 * 
 * WHY THIS MATTERS (For Interviews):
 * ----------------------------------
 * Without debouncing, every keystroke triggers an API call.
 * If user types "laptop" (6 chars), that's 6 API calls.
 * With debouncing, we wait until user stops typing, then make 1 call.
 * 
 * TECHNICAL EXPLANATION:
 * ---------------------
 * Debouncing delays execution until after a wait period of inactivity.
 * Common in: search bars, resize handlers, scroll events
 * 
 * HOW IT WORKS:
 * 1. User types → timer starts
 * 2. User types again → timer resets
 * 3. User stops typing → after delay, function executes
 * 
 * INTERVIEW TALKING POINTS:
 * ------------------------
 * - Reduces server load (fewer API calls)
 * - Improves UX (no lag while typing)
 * - Saves bandwidth
 * - Better for rate-limited APIs
 * - Alternative: Throttling (execute at regular intervals)
 * 
 * REAL-WORLD USE CASES:
 * --------------------
 * - Search autocomplete (Google, Amazon)
 * - Form validation
 * - Scroll position tracking
 * - Window resize events
 */

import { useEffect, useState } from 'react';

/**
 * GENERIC DEBOUNCE HOOK
 * 
 * @param value - The value to debounce (usually search query)
 * @param delay - Wait time in milliseconds (typically 300-500ms)
 * @returns Debounced value that updates after delay
 * 
 * EXAMPLE USAGE:
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * useEffect(() => {
 *   // This only runs when user stops typing for 300ms
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  // State to store debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    /**
     * DEBOUNCE MECHANISM:
     * Set a timer to update debounced value after delay
     */
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    /**
     * CLEANUP FUNCTION (Critical for interviews!):
     * Why cleanup? Prevents memory leaks and unwanted executions
     * 
     * When user types again before delay:
     * 1. Cleanup runs → clears old timer
     * 2. New timer starts
     * 3. Result: Only last value executes
     * 
     * Without cleanup: All timers execute → multiple API calls
     */
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run when value or delay changes

  return debouncedValue;
}

/**
 * ADVANCED: Throttle Hook (Mention in interviews as alternative)
 * ===============================================================
 * 
 * Throttling vs Debouncing:
 * - Debounce: Execute AFTER user stops (search, form validation)
 * - Throttle: Execute AT MOST once per interval (scroll, resize)
 * 
 * Example throttle scenario:
 * User scrolls for 10 seconds
 * - Debounce: Executes once at end (10 seconds later)
 * - Throttle: Executes every 500ms (20 times during scroll)
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated;

    if (timeSinceLastUpdate >= interval) {
      // Enough time passed, update immediately
      setThrottledValue(value);
      setLastUpdated(now);
    } else {
      // Not enough time, schedule update for remaining time
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        setLastUpdated(Date.now());
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval, lastUpdated]);

  return throttledValue;
}

/**
 * PERFORMANCE METRICS (For discussions):
 * ======================================
 * 
 * WITHOUT DEBOUNCE:
 * - Search "laptop": 6 API calls
 * - Average typing speed: 40 wpm = ~200 chars/min
 * - In 1 minute of typing: ~200 API calls
 * 
 * WITH DEBOUNCE (500ms):
 * - User types "laptop", pauses: 1 API call
 * - In 1 minute: ~5-10 API calls (depending on pauses)
 * 
 * SAVINGS: 95% reduction in API calls!
 */
