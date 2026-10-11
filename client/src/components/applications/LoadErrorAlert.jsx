import { RotateCcw } from 'lucide-react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function LoadErrorAlert({ onRetry }) {
  return (
    <Alert
      variant="error"
      role="alert"
      title="We couldn’t load your applications"
      action={
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      Check your connection and try again.
    </Alert>
  );
}
