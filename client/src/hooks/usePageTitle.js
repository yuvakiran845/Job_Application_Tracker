import { useEffect } from 'react';
import { useMatches } from 'react-router';
import { APP_NAME } from '../components/layout/Logo';

/** The deepest route `handle` (title, description, …) for the current page. */
export function usePageMeta() {
  const matches = useMatches();
  return matches.findLast((match) => match.handle?.title)?.handle ?? { title: APP_NAME };
}

/** Reads the deepest route `handle.title` and mirrors it into document.title. */
export function usePageTitle() {
  const { title } = usePageMeta();

  useEffect(() => {
    document.title = title === APP_NAME ? APP_NAME : `${title} · ${APP_NAME}`;
  }, [title]);

  return title;
}
