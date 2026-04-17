import { useState, useEffect, useRef } from 'react';
import { liveQuery } from '../db';

/**
 * React hook that wraps the liveQuery subscription pattern from db.js.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * 
 * @param {Function} queryFn - Async function that performs the database query
 * @param {*} initialValue - Initial value before the first query resolves
 * @param {Array} deps - Dependency array (re-subscribe when these change)
 * @returns {*} The current query result
 */
export function useLiveQuery(queryFn, initialValue = null, deps = []) {
  const [data, setData] = useState(initialValue);
  const queryFnRef = useRef(queryFn);

  // Keep queryFn ref up to date
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    const subscription = liveQuery(() => queryFnRef.current())
      .subscribe(value => {
        setData(value);
      });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
