import { useLocation, useNavigate } from 'react-router';
import { Ellipsis, ExternalLink, Eye, Pencil, Trash2 } from 'lucide-react';
import { useApplicationActions } from '../../hooks/useApplicationActions';
import { isHttpUrl } from '../../utils/validation';
import { Button } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLink,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';

/** Per-row "more actions" menu: view, edit, open posting, delete. */
export function ApplicationActionsMenu({ application }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openEdit, openDelete } = useApplicationActions();
  const name = `${application.jobTitle} at ${application.company}`;

  return (
    <DropdownMenu
      label={`Actions for ${name}`}
      trigger={(props) => (
        <Button {...props} variant="ghost" size="sm" iconOnly aria-label={`More actions for ${name}`}>
          <Ellipsis className="size-4" aria-hidden="true" />
        </Button>
      )}
    >
      <DropdownMenuItem
        icon={Eye}
        onSelect={() =>
          navigate(`/applications/${application.id}`, {
            state: { returnTo: `${location.pathname}${location.search}` },
          })
        }
      >
        View details
      </DropdownMenuItem>
      <DropdownMenuItem icon={Pencil} onSelect={() => openEdit(application)}>
        Edit
      </DropdownMenuItem>
      {application.jobUrl && isHttpUrl(application.jobUrl) && (
        <DropdownMenuLink icon={ExternalLink} href={application.jobUrl}>
          Open job posting
        </DropdownMenuLink>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => openDelete(application)}>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
