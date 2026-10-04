/**
 * useApi — generic async data-fetching hook.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(listDonations);
 *   useEffect(() => { execute(); }, [execute]);
 *
 * The hook does NOT call the API automatically — call execute() to trigger.
 * Pass arguments to execute() — they are forwarded to the service function.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(serviceFunction) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Tracks component mount lifecycle safely
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceFunction(...args);
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          'An unexpected error occurred.';
        setError(message);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [serviceFunction]);

  return { data, loading, error, execute, setData };
}
