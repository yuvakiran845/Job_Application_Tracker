import { useContext } from 'react';
import { ApplicationActionsContext } from '../context/applicationActionsContext';

/** Opens the add/edit/delete dialogs and changes status, with user feedback. */
export function useApplicationActions() {
  const context = useContext(ApplicationActionsContext);
  if (!context) throw new Error('useApplicationActions must be used inside <ApplicationActionsProvider>.');
  return context;
}
