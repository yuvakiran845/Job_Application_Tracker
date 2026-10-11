import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as applicationService from '../services/applicationService';
import { DEFAULT_QUERY } from '../utils/applicationQuery';
import { getRecentWindowStart } from '../utils/stats';

// Server state for applications, cached by TanStack Query. Every mutation updates
// or invalidates the affected queries, so lists, details and dashboard numbers
// stay in sync without manual refetching.

export const applicationKeys = {
  all: ['applications'],
  lists: () => ['applications', 'list'],
  list: (query) => ['applications', 'list', query],
  stats: (appliedSince) => ['applications', 'stats', appliedSince],
  detail: (id) => ['applications', 'detail', id],
};

/** Refetch everything derived from the collection (lists and dashboard numbers). */
function invalidateCollection(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: ['applications', 'stats'] }),
  ]);
}

/** One page of applications for a search/filter/sort query. Keeps the previous page visible while loading. */
export function useApplicationList(query) {
  return useQuery({
    queryKey: applicationKeys.list(query),
    queryFn: () => applicationService.listApplications(query),
    placeholderData: keepPreviousData,
  });
}

export function useRecentApplications(limit = 5) {
  const query = { ...DEFAULT_QUERY, sort: 'createdAt', order: 'desc', pageSize: limit };
  return useQuery({
    queryKey: applicationKeys.list(query),
    queryFn: () => applicationService.listApplications(query),
  });
}

/** Dashboard numbers; the 30-day window uses the user's local calendar. */
export function useApplicationStats() {
  const [appliedSince] = useState(() => getRecentWindowStart());
  return useQuery({
    queryKey: applicationKeys.stats(appliedSince),
    queryFn: () => applicationService.getApplicationStats({ appliedSince }),
    // Totals are cheap to compute and shown next to fresh list results, so always
    // revalidate on mount (cached numbers still show instantly) — this catches
    // changes made on another device or tab.
    staleTime: 0,
  });
}

export function useApplication(id) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationService.getApplication(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => applicationService.createApplication(input),
    onSuccess: (created) => {
      queryClient.setQueryData(applicationKeys.detail(created.id), created);
      return invalidateCollection(queryClient);
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => applicationService.updateApplication(id, changes),
    onSuccess: (updated) => {
      queryClient.setQueryData(applicationKeys.detail(updated.id), updated);
      return invalidateCollection(queryClient);
    },
  });
}

/**
 * Status changes are shown immediately in every cached list and detail view, then
 * confirmed by the server. If the save fails, every view is restored.
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => applicationService.updateApplication(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.all });
      const previousLists = queryClient.getQueriesData({ queryKey: applicationKeys.lists() });
      const previousDetail = queryClient.getQueryData(applicationKeys.detail(id));
      const apply = (item) => (item.id === id ? { ...item, ...changes } : item);

      queryClient.setQueriesData({ queryKey: applicationKeys.lists() }, (data) =>
        data ? { ...data, items: data.items.map(apply) } : data,
      );
      if (previousDetail) queryClient.setQueryData(applicationKeys.detail(id), apply(previousDetail));
      return { previousLists, previousDetail };
    },
    onError: (_error, { id }, context) => {
      for (const [key, data] of context?.previousLists ?? []) queryClient.setQueryData(key, data);
      if (context?.previousDetail) queryClient.setQueryData(applicationKeys.detail(id), context.previousDetail);
    },
    onSuccess: (updated) => queryClient.setQueryData(applicationKeys.detail(updated.id), updated),
    onSettled: () => invalidateCollection(queryClient),
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => applicationService.deleteApplication(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: applicationKeys.detail(id), exact: true });
      return invalidateCollection(queryClient);
    },
  });
}

/** Development-only (sample-data mode): restore the sample data and refresh every view. */
export function useResetSampleData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => applicationService.resetSampleData(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}
