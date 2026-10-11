import { STATUS_BY_VALUE } from '../../constants/applications';
import { Badge } from '../ui/Badge';

export function StatusBadge({ status }) {
  const meta = STATUS_BY_VALUE[status];
  if (!meta) return <Badge>Unknown</Badge>;
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
