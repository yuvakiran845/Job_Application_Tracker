import { RotateCcw } from 'lucide-react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** A failed load: explains why (data-layer messages are written for users) and offers a retry. */
export function LoadErrorAlert({ error, onRetry, title = 'We couldn’t load your applications', className }) {
  return (
    <Alert
      variant="error"
      role="alert"
      title={title}
      className={className}
      action={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {error?.message || 'Check your connection and try again.'}
    </Alert>
  );
}
