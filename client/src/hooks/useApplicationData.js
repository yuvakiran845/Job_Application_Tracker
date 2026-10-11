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
  analytics: (range) => ['applications', 'analytics', range],
  events: (range) => ['applications', 'events', range],
  activity: (id) => ['applications', 'activity', id],
};

export const viewKeys = { all: ['views'] };

/**
 * Refetch everything derived from the collection: lists, dashboard numbers,
 * analytics, calendar events and activity. Details are updated directly instead.
 */
function invalidateCollection(queryClient) {
  return queryClient.invalidateQueries({
    queryKey: applicationKeys.all,
    predicate: (query) => query.queryKey[1] !== 'detail',
  });
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

/** A list query's status filter, if any (e.g. one Kanban column). */
function listStatus(queryKey) {
  return queryKey[2]?.status || '';
}

/**
 * Status changes are shown immediately in every cached list and detail view, then
 * confirmed by the server. In lists filtered by status (Kanban columns) the item
 * moves to the matching list. If the save fails, every view is restored.
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => applicationService.updateApplication(id, changes),
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.all });
      const previousLists = queryClient.getQueriesData({ queryKey: applicationKeys.lists() });
      const previousDetail = queryClient.getQueryData(applicationKeys.detail(id));

      const original =
        previousDetail ??
        previousLists.flatMap(([, data]) => data?.items ?? []).find((item) => item.id === id);
      const updated = original ? { ...original, ...changes } : null;

      for (const [key, data] of previousLists) {
        if (!data || !updated) continue;
        const status = listStatus(key);
        const without = data.items.filter((item) => item.id !== id);
        const contains = without.length !== data.items.length;
        let items;
        if (!status) items = data.items.map((item) => (item.id === id ? updated : item));
        else if (status === updated.status) items = contains ? data.items.map((item) => (item.id === id ? updated : item)) : [updated, ...data.items];
        else items = without;
        if (items !== data.items) {
          const delta = items.length - data.items.length;
          queryClient.setQueryData(key, { ...data, items, meta: { ...data.meta, total: data.meta.total + delta } });
        }
      }
      if (previousDetail) queryClient.setQueryData(applicationKeys.detail(id), updated);
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
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
      queryClient.invalidateQueries({ queryKey: viewKeys.all }),
    ]),
  });
}

// ---- Level 7 features --------------------------------------------------------

export const PIPELINE_COLUMN_LIMIT = 100;

/** One Kanban column: up to 100 applications in a status, newest first. */
export function useApplicationsByStatus(status) {
  const query = { ...DEFAULT_QUERY, status, sort: 'createdAt', order: 'desc', pageSize: PIPELINE_COLUMN_LIMIT };
  return useQuery({
    queryKey: applicationKeys.list(query),
    queryFn: () => applicationService.listApplications(query),
  });
}

export function useAnalytics(range) {
  return useQuery({
    queryKey: applicationKeys.analytics(range),
    queryFn: () => applicationService.getAnalytics(range),
    placeholderData: keepPreviousData,
  });
}

/** `range` comes from utils/calendar.js toEventRange(). */
export function useEvents(range) {
  return useQuery({
    queryKey: applicationKeys.events(range),
    queryFn: () => applicationService.listEvents(range),
    placeholderData: keepPreviousData,
  });
}

export function useActivity(id) {
  return useQuery({
    queryKey: applicationKeys.activity(id),
    queryFn: () => applicationService.listActivity(id),
  });
}

/** Downloads a CSV of the applications matching `query`. */
export function useExportApplications() {
  return useMutation({ mutationFn: (query) => applicationService.exportApplications(query) });
}

export function useSavedViews() {
  return useQuery({ queryKey: viewKeys.all, queryFn: () => applicationService.listViews() });
}

export function useCreateView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (view) => applicationService.createView(view),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: viewKeys.all }),
  });
}

export function useDeleteView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => applicationService.deleteView(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: viewKeys.all }),
  });
}
