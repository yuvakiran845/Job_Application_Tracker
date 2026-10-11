import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookmarkPlus, X } from 'lucide-react';
import { useCreateView, useDeleteView, useSavedViews } from '../../hooks/useApplicationData';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/format';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';

function SaveViewForm({ queryString, onDone }) {
  const createView = useCreateView();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (createView.isPending) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      const view = await createView.mutateAsync({ name: name.trim(), query: queryString });
      toast({ title: 'View saved', description: `“${view.name}” is ready to use.` });
      onDone();
    } catch (caught) {
      if (caught.fieldErrors?.name) setError(caught.fieldErrors.name);
      else setFormError(caught.message || 'Couldn’t save the view. Please try again.');
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <ModalBody>
        {formError && (
          <Alert variant="error" role="alert" className="mb-4">
            {formError}
          </Alert>
        )}
        <Field id="saved-view-name" label="View name" error={error} hint="e.g. “Interviews this month”">
          {(aria) => (
            <TextInput
              {...aria}
              data-autofocus
              maxLength={40}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
            />
          )}
        </Field>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onDone} disabled={createView.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={createView.isPending}>
          Save view
        </Button>
      </ModalFooter>
    </form>
  );
}

/**
 * Saved filter views: one click applies a view's filters (via the URL), and the
 * current filters can be saved under a name. Views are stored per account.
 */
export function SavedViewsBar({ queryString, canSave }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const viewsQuery = useSavedViews();
  const deleteView = useDeleteView();
  const [saving, setSaving] = useState(false);
  const views = viewsQuery.data ?? [];

  if (views.length === 0 && !canSave) return null;

  async function handleDelete(view) {
    try {
      await deleteView.mutateAsync(view.id);
      toast({ variant: 'info', title: 'View deleted', description: `“${view.name}” was removed.` });
    } catch (error) {
      toast({ variant: 'error', title: 'Couldn’t delete the view', description: error.message });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
      <span className="text-xs font-medium text-slate-500">Saved views</span>
      {views.length === 0 && <span className="text-xs text-slate-400">None yet</span>}
      <ul className="contents">
        {views.map((view) => {
          const active = view.query === queryString;
          return (
            <li
              key={view.id}
              className={cn(
                'inline-flex items-center rounded-full ring-1 ring-inset',
                active ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-slate-300',
              )}
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => navigate(view.query ? `/applications?${view.query}` : '/applications')}
                className={cn(
                  'cursor-pointer rounded-l-full py-1 pr-1.5 pl-3 text-xs font-medium',
                  active ? 'text-brand-700' : 'text-slate-700 hover:text-slate-900',
                )}
              >
                {view.name}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(view)}
                aria-label={`Delete view ${view.name}`}
                className="cursor-pointer rounded-r-full py-1 pr-2 pl-1 text-slate-400 hover:text-rose-600"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {canSave && (
        <Button variant="ghost" size="sm" icon={BookmarkPlus} onClick={() => setSaving(true)}>
          Save view
        </Button>
      )}

      <Modal
        open={saving}
        onClose={() => setSaving(false)}
        size="sm"
        title="Save this view"
        description="Saves the current search, filters and sort so you can return to them in one click."
      >
        <SaveViewForm queryString={queryString} onDone={() => setSaving(false)} />
      </Modal>
    </div>
  );
}
