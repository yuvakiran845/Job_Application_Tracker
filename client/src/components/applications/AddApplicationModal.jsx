import { useApplications } from '../../hooks/useApplications';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { ApplicationForm } from './ApplicationForm';

export function AddApplicationModal({ open, onClose }) {
  const { addApplication } = useApplications();
  const { toast } = useToast();

  async function handleSubmit(values) {
    // Errors propagate to ApplicationForm, which shows them inside the dialog.
    const created = await addApplication(values);
    onClose();
    toast({
      variant: 'success',
      title: 'Application added',
      description: `${created.jobTitle} at ${created.company}`,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Add application"
      description="Track a role you’ve applied to, or save one to apply to later."
    >
      <ApplicationForm onSubmit={handleSubmit} onCancel={onClose} submitLabel="Add application" />
    </Modal>
  );
}
