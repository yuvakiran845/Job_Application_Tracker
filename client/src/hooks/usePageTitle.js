import { useEffect } from 'react';
import { useMatches } from 'react-router';

const APP_NAME = 'CareerFlow';

/** Reads the deepest route `handle.title` and mirrors it into document.title. */
export function usePageTitle() {
  const matches = useMatches();
  const title = matches.findLast((match) => match.handle?.title)?.handle.title ?? APP_NAME;

  useEffect(() => {
    document.title = title === APP_NAME ? APP_NAME : `${title} · ${APP_NAME}`;
  }, [title]);

  return title;
}
