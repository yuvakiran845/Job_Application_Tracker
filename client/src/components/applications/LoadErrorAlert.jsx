import { RotateCcw } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Shown when the applications list fails to load; explains why and offers a retry. */
export function LoadErrorAlert() {
  const { error, reload } = useApplications();
  return (
    <Alert
      variant="error"
      role="alert"
      title="We couldn’t load your applications"
      action={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={reload}>
          Try again
        </Button>
      }
    >
      {/* Data-layer error messages are written to be shown to users. */}
      {error?.message || 'Check your connection and try again.'}
    </Alert>
  );
}
