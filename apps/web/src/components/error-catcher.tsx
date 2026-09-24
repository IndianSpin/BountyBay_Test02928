'use client';

/**
 * ErrorCatcher (DA-P1-SPEC §4.4): captures uncaught window errors and
 * unhandled rejections as client_exception events. Sanitized by
 * construction — the message/stack are length-capped, the path is the
 * PATHNAME ONLY (never query strings or hashes), and nothing else ever
 * leaves the browser (docs/10). Best-effort: the handler must never
 * throw.
 */

import { useEffect } from 'react';
import { useApiToken } from '../hooks/use-api-token';
import { trackEvent } from '../lib/analytics';

export default function ErrorCatcher() {
  const { token, ready } = useApiToken();

  useEffect(() => {
    function handler(event: ErrorEvent): void {
      try {
        if (!ready || !token) return;
        trackEvent('client_exception', token, undefined, {
          message: (event.message ?? 'unknown').slice(0, 500),
          stack: (event.error?.stack ?? '').slice(0, 2000),
          path: window.location.pathname.slice(0, 200),
        });
      } catch {
        /* never throw from the handler */
      }
    }

    function rejectionHandler(event: PromiseRejectionEvent): void {
      try {
        if (!ready || !token) return;
        let message = 'unknown rejection';
        try {
          message = typeof event.reason === 'string' ? event.reason : event.reason instanceof Error ? event.reason.message : JSON.stringify(event.reason);
        } catch {
          message = 'unknown rejection';
        }
        trackEvent('client_exception', token, undefined, {
          message: message.slice(0, 500),
          path: window.location.pathname.slice(0, 200),
        });
      } catch {
        /* never throw from the handler */
      }
    }

    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [ready, token]);

  return null;
}
