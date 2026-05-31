import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        60_000,      // data stays fresh for 1 min
      gcTime:           5 * 60_000,  // cache kept for 5 mins
      retry:            2,
      refetchOnWindowFocus: true,    // auto-refresh when user comes back to tab
    },
  },
});
