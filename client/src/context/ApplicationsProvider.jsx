import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as applicationService from '../services/applicationService';
import { ApplicationsContext } from './applicationsContext';

const INITIAL_STATE = { status: 'loading', applications: [], error: null };

function replaceApplication(state, id, replace) {
  return { ...state, applications: state.applications.map((item) => (item.id === id ? replace(item) : item)) };
}

export function ApplicationsProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [reloadKey, setReloadKey] = useState(0);
  // Latest list for event handlers (optimistic rollback) without re-creating callbacks.
  const applicationsRef = useRef(state.applications);

  useEffect(() => {
    applicationsRef.current = state.applications;
  });

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

  /**
   * Updates an application. With `optimistic: true` the change is shown at once
   * and rolled back if the save fails (unless something else changed it since).
   */
  const updateApplication = useCallback(async (id, changes, { optimistic = false } = {}) => {
    const previous = applicationsRef.current.find((item) => item.id === id);
    if (optimistic && previous) {
      setState((current) => replaceApplication(current, id, (item) => ({ ...item, ...changes })));
    }

    try {
      const updated = await applicationService.updateApplication(id, changes);
      setState((current) => replaceApplication(current, id, () => updated));
      return updated;
    } catch (error) {
      if (optimistic && previous) {
        const keys = Object.keys(changes);
        setState((current) =>
          replaceApplication(current, id, (item) =>
            keys.every((key) => item[key] === changes[key])
              ? { ...item, ...Object.fromEntries(keys.map((key) => [key, previous[key]])) }
              : item,
          ),
        );
      }
      throw error;
    }
  }, []);

  const deleteApplication = useCallback(async (id) => {
    await applicationService.deleteApplication(id);
    setState((current) => ({ ...current, applications: current.applications.filter((item) => item.id !== id) }));
  }, []);

  const resetToSampleData = useCallback(async () => {
    await applicationService.resetSampleData();
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ ...state, reload, addApplication, updateApplication, deleteApplication, resetToSampleData }),
    [state, reload, addApplication, updateApplication, deleteApplication, resetToSampleData],
  );

  return <ApplicationsContext value={value}>{children}</ApplicationsContext>;
}
