import { useCallback, useMemo, useState } from 'react';
import { ApplicationForm } from '../components/applications/ApplicationForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { STATUS_BY_VALUE } from '../constants/applications';
import { useApplications } from '../hooks/useApplications';
import { useToast } from '../hooks/useToast';
import { getDefaultFormValues, getStatusChange, toFormValues } from '../utils/applicationModel';
import { todayISO } from '../utils/date';
import { ApplicationActionsContext } from './applicationActionsContext';

function describe(application) {
  return `${application.jobTitle} at ${application.company}`;
}

/**
 * Owns the Add, Edit and Delete dialogs so any component can open them, and
 * wraps data mutations with toasts. Must render inside the router and the
 * Applications/Toast providers.
 */
export function ApplicationActionsProvider({ children }) {
  const { addApplication, updateApplication, deleteApplication } = useApplications();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const openAdd = useCallback(() => setAdding(true), []);
  const openEdit = useCallback((application) => setEditing(application), []);
  const openDelete = useCallback(
    (application, { onDeleted } = {}) => setDeleting({ application, onDeleted }),
    [],
  );

  const changeStatus = useCallback(
    async (application, nextStatus) => {
      if (application.status === nextStatus) return;
      const changes = getStatusChange(application, nextStatus, todayISO());
      try {
        const updated = await updateApplication(application.id, changes, { optimistic: true });
        const dateNote = changes.appliedDate ? ' Applied date set to today.' : '';
        toast({
          title: 'Status updated',
          description: `${describe(updated)} moved to ${STATUS_BY_VALUE[nextStatus].label}.${dateNote}`,
        });
      } catch (error) {
        toast({
          variant: 'error',
          title: 'Couldn’t update status',
          description: error?.name === 'NotFoundError' ? error.message : 'Your change was undone. Please try again.',
        });
      }
    },
    [updateApplication, toast],
  );

  async function handleAdd(input) {
    const created = await addApplication(input);
    setAdding(false);
    toast({ title: 'Application added', description: describe(created) });
  }

  async function handleEdit(input) {
    const updated = await updateApplication(editing.id, input);
    setEditing(null);
    toast({ title: 'Changes saved', description: describe(updated) });
  }

  async function handleDelete() {
    const { application, onDeleted } = deleting;
    await deleteApplication(application.id);
    setDeleting(null);
    toast({ title: 'Application deleted', description: describe(application) });
    onDeleted?.();
  }

  const value = useMemo(
    () => ({ openAdd, openEdit, openDelete, changeStatus }),
    [openAdd, openEdit, openDelete, changeStatus],
  );

  return (
    <ApplicationActionsContext value={value}>
      {children}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        size="lg"
        title="Add application"
        description="Track a role you’ve applied to, or save one to apply to later."
      >
        <ApplicationForm
          initialValues={getDefaultFormValues(todayISO())}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
          submitLabel="Add application"
        />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title="Edit application"
        description={editing ? describe(editing) : undefined}
      >
        {editing && (
          <ApplicationForm
            initialValues={toFormValues(editing)}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete application?"
        description={
          deleting
            ? `This permanently removes ${describe(deleting.application)}, including its notes and contact details.`
            : undefined
        }
        confirmLabel="Delete application"
      />
    </ApplicationActionsContext>
  );
}
