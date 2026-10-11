import { ACTIVITY_FIELD_LABELS, APPLICATION_STATUSES, getOptionLabel } from '../constants/applications';

const statusLabel = (value) => getOptionLabel(APPLICATION_STATUSES, value) || value;
const listFormat = new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' });

/** One readable sentence for a timeline entry. */
export function describeActivity(entry) {
  if (entry.type === 'created') return `Added with status ${statusLabel(entry.toStatus)}`;
  if (entry.type === 'status_changed') {
    return `Status changed from ${statusLabel(entry.fromStatus)} to ${statusLabel(entry.toStatus)}`;
  }
  const fields = (entry.fields ?? []).map((field) => ACTIVITY_FIELD_LABELS[field] ?? field);
  return `Updated ${listFormat.format(fields)}`;
}
