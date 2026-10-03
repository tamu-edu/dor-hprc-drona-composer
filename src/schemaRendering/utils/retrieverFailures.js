import React from 'react';

/**
 * Background refreshes (refreshInterval polls) that fail after an element has
 * already shown data don't raise the global error alert straight away: the
 * element keeps its last good data and shows RefreshFailedNotice instead.
 * The global alert is raised once this many polls in a row have failed.
 */
export const FAILURE_ESCALATION_THRESHOLD = 3;

/**
 * Normalise anything thrown while running a retriever (the {message,
 * status_code, details} objects from executeScript, or e.g. a SyntaxError from
 * parsing invalid JSON) into the shape the global error alert expects.
 */
export function toRetrieverError(err) {
  if (err && typeof err === 'object' && 'status_code' in err) return err;
  if (err instanceof SyntaxError) {
    return { message: 'Retriever returned invalid JSON', status_code: null, details: err.message };
  }
  return { message: err?.message || String(err), status_code: null, details: '' };
}

export function logRetrieverFailure(retrieverPath, error, consecutiveFailures) {
  console.warn(
    `[retriever] ${retrieverPath} failed (${consecutiveFailures} in a row):`,
    error?.message,
    error?.details
  );
}

export function formatAge(timestamp, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Inline marker for an element whose last refresh failed but still shows
 * older data. The full error is in the tooltip.
 */
export function RefreshFailedNotice({ error, lastSuccessAt }) {
  if (!error) return null;
  const tooltip = [error.status_code ? `HTTP ${error.status_code}` : null, error.message]
    .filter(Boolean)
    .join(': ');

  return (
    <div
      className="text-warning mt-1"
      style={{ fontSize: '0.8em' }}
      title={tooltip}
      role="status"
      data-testid="refresh-failed-notice"
    >
      ⚠ Refresh failed{lastSuccessAt ? `, showing data from ${formatAge(lastSuccessAt)}` : ''}
    </div>
  );
}
