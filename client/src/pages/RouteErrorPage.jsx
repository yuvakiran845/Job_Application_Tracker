import { useRouteError } from 'react-router';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

/** Last-resort screen for unexpected rendering errors. Details go to the console, not the UI. */
export default function RouteErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xs">
        <EmptyState
          icon={TriangleAlert}
          title="Something went wrong"
          description="An unexpected error stopped this page from loading. Reloading usually fixes it."
          action={
            <Button icon={RotateCcw} onClick={() => window.location.reload()}>
              Reload page
            </Button>
          }
        />
      </div>
    </main>
  );
}
