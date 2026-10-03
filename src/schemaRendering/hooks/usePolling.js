/**
 * @name usePolling
 * @description Runs a callback every `intervalSeconds` for elements with a
 * `refreshInterval`, while avoiding polls that cannot produce anything new:
 *
 * - Pauses while the browser tab is hidden, and catches up with one call when
 *   it becomes visible again (only if it was hidden for at least one interval).
 * - Optional `refreshWhile` condition (same syntax as `condition`): polling
 *   only runs while it evaluates true. When it turns false (e.g. the job
 *   finished) one final call is made, so the last state is still picked up.
 *
 * @example
 * usePolling(() => refetch({ background: true }), props.refreshInterval, {
 *   refreshWhile: props.refreshWhile, // e.g. "!drona_status.DONE"
 * });
 */

import { useContext, useEffect, useRef, useState } from 'react';
import { FormValuesContext } from '../FormValuesContext';
import { evaluateCondition } from '../utils/conditionEvaluator';

const isDocumentVisible = () =>
  typeof document === 'undefined' || document.visibilityState !== 'hidden';

export function usePageVisible() {
  const [isVisible, setIsVisible] = useState(isDocumentVisible);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onChange = () => setIsVisible(isDocumentVisible());
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return isVisible;
}

export function usePolling(callback, intervalSeconds, { refreshWhile, enabled = true } = {}) {
  const { values: formValues } = useContext(FormValuesContext);
  const isVisible = usePageVisible();

  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Schemas often give the interval as a string ("15")
  const intervalMs = Number(intervalSeconds) * 1000;
  const hasInterval = enabled && intervalMs > 0;
  const conditionMet = refreshWhile ? !!evaluateCondition(refreshWhile, formValues || []) : true;
  const isActive = hasInterval && conditionMet;

  // Final fetch when refreshWhile turns false, so e.g. the last samples
  // written before a job ended still show up.
  const prevConditionMetRef = useRef(conditionMet);
  useEffect(() => {
    if (hasInterval && prevConditionMetRef.current && !conditionMet) {
      callbackRef.current();
    }
    prevConditionMetRef.current = conditionMet;
  }, [conditionMet, hasInterval]);

  // Catch up once when the tab comes back, if we skipped at least one poll.
  const hiddenAtRef = useRef(null);
  useEffect(() => {
    if (!isVisible) {
      hiddenAtRef.current = Date.now();
      return;
    }
    const hiddenAt = hiddenAtRef.current;
    hiddenAtRef.current = null;
    if (isActive && hiddenAt !== null && Date.now() - hiddenAt >= intervalMs) {
      callbackRef.current();
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isActive || !isVisible) return undefined;
    const timer = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [isActive, isVisible, intervalMs]);
}

export default usePolling;
