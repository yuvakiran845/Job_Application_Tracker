import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Modal, ModalBody, ModalFooter } from './Modal';

function ConfirmDialogContent({ onClose, onConfirm, confirmLabel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (caught) {
      setError(caught?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <ModalBody className="py-4">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <TriangleAlert className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
          This can’t be undone.
        </p>
        {error && (
          <Alert variant="error" role="alert" className="mt-4">
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        {/* Cancel gets initial focus so pressing Enter by accident is safe. */}
        <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </>
  );
}

/** Confirmation for destructive actions. `onConfirm` may be async; errors are shown inline. */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <ConfirmDialogContent onClose={onClose} onConfirm={onConfirm} confirmLabel={confirmLabel} />
    </Modal>
  );
}
