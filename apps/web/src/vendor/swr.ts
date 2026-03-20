"use client";

import { useEffect, useState } from "react";

type Key = string | null;

type SWRResponse<Data, Error> = {
  data: Data | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => Promise<void>;
};

type CacheEntry<Data> = {
  data?: Data;
  error?: unknown;
  promise?: Promise<void>;
};

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  const keyListeners = listeners.get(key);
  if (!keyListeners) {
    return;
  }

  keyListeners.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  const keyListeners = listeners.get(key) ?? new Set<() => void>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);

  return () => {
    keyListeners.delete(listener);
    if (keyListeners.size === 0) {
      listeners.delete(key);
    }
  };
}

export default function useSWR<Data, Error = unknown>(
  key: Key,
  fetcher: (key: string) => Promise<Data>
): SWRResponse<Data, Error> {
  const [state, setState] = useState(() => {
    if (!key) {
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
      };
    }

    const entry = cache.get(key);
    return {
      data: entry?.data as Data | undefined,
      error: entry?.error as Error | undefined,
      isLoading: !entry?.data,
    };
  });

  useEffect(() => {
    if (!key) {
      return;
    }

    const sync = () => {
      const entry = cache.get(key);
      setState({
        data: entry?.data as Data | undefined,
        error: entry?.error as Error | undefined,
        isLoading: Boolean(entry?.promise) && entry?.data === undefined,
      });
    };

    const revalidate = async () => {
      const current = cache.get(key) ?? {};
      if (!current.promise) {
        current.promise = fetcher(key)
          .then((data) => {
            cache.set(key, { data });
            emit(key);
          })
          .catch((error: unknown) => {
            cache.set(key, { error, data: current.data });
            emit(key);
          })
          .finally(() => {
            const next = cache.get(key);
            if (next) {
              delete next.promise;
              cache.set(key, next);
              emit(key);
            }
          });

        cache.set(key, current);
        emit(key);
      }

      await current.promise;
    };

    sync();
    void revalidate();

    return subscribe(key, sync);
  }, [fetcher, key]);

  return {
    ...state,
    mutate: async () => {
      if (!key) {
        return;
      }

      cache.delete(key);
      emit(key);

      const data = await fetcher(key);
      cache.set(key, { data });
      emit(key);
    },
  };
}
