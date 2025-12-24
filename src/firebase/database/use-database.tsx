'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onValue,
  off,
  DatabaseReference,
  DataSnapshot
} from 'firebase/database';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * React hook to subscribe to a Realtime Database list (collection).
 * Handles nullable references/queries.
 * @template T Type of the document data.
 * @param {DatabaseReference | Query | null | undefined} memoizedRefOrQuery - The RTDB reference or query.
 * @returns Object with data, isLoading, error.
 */
export function useDatabaseList<T = any>(
  memoizedRefOrQuery: (DatabaseReference | Query) | null | undefined
) {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRefOrQuery) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);

    const listener = onValue(
      memoizedRefOrQuery,
      (snapshot: DataSnapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: WithId<T>[] = Object.keys(val).map(key => ({
            ...val[key],
            id: key,
          }));
          setData(list);
        } else {
          setData([]);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: Error) => {
        console.error("useDatabaseList error:", err);
        setError(err);
        setData(null);
        setIsLoading(false);
      }
    );

    return () => {
      off(memoizedRefOrQuery, 'value', listener);
    };
  }, [memoizedRefOrQuery]);

  return { data, isLoading, error };
}

/**
 * React hook to subscribe to a single Realtime Database object.
 * @template T Type of the document data.
 * @param {DatabaseReference | null | undefined} memoizedRef - The RTDB reference.
 * @returns Object with data, isLoading, error.
 */
export function useDatabaseObject<T = any>(
  memoizedRef: DatabaseReference | null | undefined
) {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedRef) {
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);

    const listener = onValue(
      memoizedRef,
      (snapshot: DataSnapshot) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.val() as T), id: snapshot.key! });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: Error) => {
        console.error("useDatabaseObject error:", err);
        setError(err);
        setData(null);
        setIsLoading(false);
      }
    );

    return () => {
      off(memoizedRef, 'value', listener);
    };
  }, [memoizedRef]);

  return { data, isLoading, error };
}
