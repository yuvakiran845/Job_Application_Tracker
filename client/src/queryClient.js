import { QueryClient } from '@tanstack/react-query';

/** Only transient failures (network, timeouts, 5xx) are worth retrying automatically. */
function isTransient(error) {
  return error?.name === 'ApiError' && (!error.status || error.status >= 500);
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays "fresh" briefly so moving between pages doesn't refetch everything.
        staleTime: 30_000,
        retry: (failureCount, error) => isTransient(error) && failureCount < 2,
      },
      mutations: {
        // Never repeat a write automatically: it could create duplicates.
        retry: false,
      },
    },
  });
}
