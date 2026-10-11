import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseApplicationQuery, toSearchParams } from '../utils/applicationQuery';

/**
 * The applications list query (search, filters, sort, page), stored in the URL so
 * views can be bookmarked, shared and survive a refresh.
 */
export function useApplicationQuery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseApplicationQuery(searchParams), [searchParams]);

  /** Merge `changes` into the query. Any change other than paging returns to page 1. */
  const updateQuery = useCallback(
    (changes) => {
      const isPaging = Object.keys(changes).every((key) => key === 'page');
      setSearchParams(
        (current) => toSearchParams({ ...parseApplicationQuery(current), ...(isPaging ? {} : { page: 1 }), ...changes }),
        // Filters keep the scroll position; paging scrolls back to the top of the list.
        { replace: true, preventScrollReset: !isPaging },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    updateQuery({ q: '', status: '', location: '', from: '', to: '' });
  }, [updateQuery]);

  return { query, updateQuery, clearFilters };
}
