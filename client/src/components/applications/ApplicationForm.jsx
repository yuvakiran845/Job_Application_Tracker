import { useMemo, useRef, useState } from 'react';
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  FIELD_LIMITS,
} from '../../constants/applications';
import { getDefaultApplicationValues } from '../../utils/applicationModel';
import { todayISO } from '../../utils/date';
import { pluralize } from '../../utils/format';
import { validateApplicationInput } from '../../utils/validation';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Field, Select, TextInput, Textarea } from '../ui/Field';
import { ModalBody, ModalFooter } from '../ui/Modal';

// Order in which errors are focused and counted (matches the visual order).
const FIELD_ORDER = ['company', 'jobTitle', 'location', 'employmentType', 'status', 'appliedDate', 'source', 'jobUrl', 'notes'];

/**
 * Add-application form, laid out for use inside <Modal>.
 * Errors appear once a field has been visited or after a submit attempt, and
 * update live as the user corrects them.
 */
export function ApplicationForm({ onSubmit, onCancel, submitLabel = 'Save application' }) {
  const formRef = useRef(null);
  const [today] = useState(() => todayISO());
  const [values, setValues] = useState(() => getDefaultApplicationValues(today));
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [serverErrors, setServerErrors] = useState({});

  const errors = useMemo(() => validateApplicationInput(values, { today }), [values, today]);
  const invalidFields = FIELD_ORDER.filter((name) => errors[name]);

  function errorFor(name) {
    if (serverErrors[name]) return serverErrors[name];
    return submitAttempted || touched[name] ? errors[name] : undefined;
  }

  function focusField(name) {
    formRef.current?.elements.namedItem(name)?.focus();
  }

  function fieldProps(name) {
    return {
      name,
      value: values[name],
      onChange: (event) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        if (serverErrors[name]) {
          setServerErrors((current) => ({ ...current, [name]: undefined }));
        }
      },
      onBlur: () => setTouched((current) => (current[name] ? current : { ...current, [name]: true })),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitAttempted(true);
    setSubmitError('');
    if (invalidFields.length > 0) {
      focusField(invalidFields[0]);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      const fieldErrors = error?.fieldErrors ?? {};
      setServerErrors(fieldErrors);
      setSubmitError(error?.message || 'Something went wrong while saving. Please try again.');
      const firstServerError = FIELD_ORDER.find((name) => fieldErrors[name]);
      if (firstServerError) focusField(firstServerError);
      setSubmitting(false);
    }
  }

  const appliedDateRequired = values.status !== 'saved';

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        {submitAttempted && invalidFields.length > 0 && (
          <Alert variant="error" role="alert" className="mb-5">
            Please fix {pluralize(invalidFields.length, 'field')} highlighted below.
          </Alert>
        )}
        {submitError && (
          <Alert variant="error" role="alert" className="mb-5">
            {submitError}
          </Alert>
        )}

        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field id="application-company" label="Company" required error={errorFor('company')}>
            {(aria) => (
              <TextInput
                {...aria}
                {...fieldProps('company')}
                data-autofocus
                autoComplete="organization"
                maxLength={FIELD_LIMITS.company}
                placeholder="e.g. Northwind Labs"
              />
            )}
          </Field>

          <Field id="application-job-title" label="Job title" required error={errorFor('jobTitle')}>
            {(aria) => (
              <TextInput
                {...aria}
                {...fieldProps('jobTitle')}
                autoComplete="organization-title"
                maxLength={FIELD_LIMITS.jobTitle}
                placeholder="e.g. Frontend Engineer"
              />
            )}
          </Field>

          <Field id="application-location" label="Location" required error={errorFor('location')}>
            {(aria) => (
              <TextInput
                {...aria}
                {...fieldProps('location')}
                maxLength={FIELD_LIMITS.location}
                placeholder="e.g. Bengaluru, India or Remote"
              />
            )}
          </Field>

          <Field id="application-employment-type" label="Employment type" optional error={errorFor('employmentType')}>
            {(aria) => (
              <Select {...aria} {...fieldProps('employmentType')} options={EMPLOYMENT_TYPES} placeholder="Not specified" />
            )}
          </Field>

          <Field id="application-status" label="Status" required error={errorFor('status')}>
            {(aria) => <Select {...aria} {...fieldProps('status')} options={APPLICATION_STATUSES} />}
          </Field>

          <Field
            id="application-applied-date"
            label="Applied date"
            required={appliedDateRequired}
            optional={!appliedDateRequired}
            hint={appliedDateRequired ? undefined : 'Leave empty until you apply.'}
            error={errorFor('appliedDate')}
          >
            {(aria) => <TextInput {...aria} {...fieldProps('appliedDate')} type="date" max={today} />}
          </Field>

          <Field id="application-source" label="Source" optional error={errorFor('source')}>
            {(aria) => (
              <Select {...aria} {...fieldProps('source')} options={APPLICATION_SOURCES} placeholder="Select a source" />
            )}
          </Field>

          <Field id="application-job-url" label="Job posting URL" optional error={errorFor('jobUrl')}>
            {(aria) => (
              <TextInput
                {...aria}
                {...fieldProps('jobUrl')}
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://"
              />
            )}
          </Field>

          <Field
            id="application-notes"
            label="Notes"
            optional
            hint={`${values.notes.length} / ${FIELD_LIMITS.notes} characters`}
            error={errorFor('notes')}
            className="sm:col-span-2"
          >
            {(aria) => (
              <Textarea
                {...aria}
                {...fieldProps('notes')}
                rows={3}
                maxLength={FIELD_LIMITS.notes}
                placeholder="Referral contact, salary expectations, next steps…"
              />
            )}
          </Field>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </ModalFooter>
    </form>
  );
}
