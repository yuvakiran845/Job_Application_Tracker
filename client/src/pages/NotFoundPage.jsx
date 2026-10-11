import { Compass, LayoutDashboard } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="We couldn’t find that page"
        description="The link may be broken, or the page may have moved."
        action={
          <ButtonLink to="/" icon={LayoutDashboard}>
            Back to dashboard
          </ButtonLink>
        }
        className="py-16"
      />
    </Card>
  );
}
