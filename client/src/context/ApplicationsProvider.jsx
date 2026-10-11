import { useCallback, useEffect, useMemo, useState } from 'react';
import * as applicationService from '../services/applicationService';
import { ApplicationsContext } from './applicationsContext';

const INITIAL_STATE = { status: 'loading', applications: [], error: null };

export function ApplicationsProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    applicationService.listApplications().then(
      (applications) => {
        if (!ignore) setState({ status: 'success', applications, error: null });
      },
      (error) => {
        if (!ignore) setState({ status: 'error', applications: [], error });
      },
    );
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', error: null }));
    setReloadKey((key) => key + 1);
  }, []);

  const addApplication = useCallback(async (input) => {
    const created = await applicationService.createApplication(input);
    setState((current) => ({ ...current, applications: [created, ...current.applications] }));
    return created;
  }, []);

  const resetToSampleData = useCallback(async () => {
    await applicationService.resetSampleData();
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ ...state, reload, addApplication, resetToSampleData }),
    [state, reload, addApplication, resetToSampleData],
  );

  return <ApplicationsContext value={value}>{children}</ApplicationsContext>;
}
