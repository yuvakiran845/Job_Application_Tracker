import { useMemo, useRef, useState } from 'react';
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  FIELD_LIMITS,
  STATUS_BY_VALUE,
} from '../../constants/applications';
import { fromFormValues } from '../../utils/applicationModel';
import { todayISO } from '../../utils/date';
import { pluralize } from '../../utils/format';
import { validateApplicationInput } from '../../utils/validation';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Field, FormSection, Select, TextInput, Textarea } from '../ui/Field';
import { ModalBody, ModalFooter } from '../ui/Modal';

// Order in which errors are counted and focused (matches the visual order).
const FIELD_ORDER = [
  'company',
  'jobTitle',
  'location',
  'employmentType',
  'salaryRange',
  'source',
  'jobUrl',
  'status',
  'appliedDate',
  'deadline',
  'interviewDate',
  'contact.name',
  'contact.email',
  'contact.phone',
  'notes',
];

function getPath(values, path) {
  return path.split('.').reduce((value, key) => value?.[key], values) ?? '';
}

function setPath(values, path, value) {
  const [key, nestedKey] = path.split('.');
  return nestedKey ? { ...values, [key]: { ...values[key], [nestedKey]: value } } : { ...values, [key]: value };
}

/**
 * Create/edit form for an application, laid out for use inside <Modal>.
 * Errors appear once a field has been visited or after a submit attempt, and
 * update live as the user corrects them. `onSubmit` receives record-shaped input
 * and may throw a ValidationError whose field errors are shown inline.
 */
export function ApplicationForm({ initialValues, onSubmit, onCancel, submitLabel }) {
  const formRef = useRef(null);
  const [today] = useState(() => todayISO());
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [serverErrors, setServerErrors] = useState({});

  const errors = useMemo(() => validateApplicationInput(fromFormValues(values), { today }), [values, today]);
  const invalidFields = FIELD_ORDER.filter((path) => errors[path]);

  function errorFor(path) {
    if (serverErrors[path]) return serverErrors[path];
    return submitAttempted || touched[path] ? errors[path] : undefined;
  }

  function focusField(path) {
    formRef.current?.elements.namedItem(path)?.focus();
  }

  function fieldProps(path) {
    return {
      name: path,
      value: getPath(values, path),
      onChange: (event) => {
        const { value } = event.target;
        setValues((current) => {
          let next = setPath(current, path, value);
          // Moving a job into a submitted status suggests today as the applied date.
          if (path === 'status' && !next.appliedDate && STATUS_BY_VALUE[value]?.requiresAppliedDate) {
            next = { ...next, appliedDate: today };
          }
          return next;
        });
        if (serverErrors[path]) setServerErrors((current) => ({ ...current, [path]: undefined }));
      },
      onBlur: () => setTouched((current) => (current[path] ? current : { ...current, [path]: true })),
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
      await onSubmit(fromFormValues(values));
    } catch (error) {
      const fieldErrors = error?.fieldErrors ?? {};
      setServerErrors(fieldErrors);
      setSubmitError(error?.message || 'Something went wrong while saving. Please try again.');
      const firstServerError = FIELD_ORDER.find((path) => fieldErrors[path]);
      if (firstServerError) focusField(firstServerError);
      setSubmitting(false);
    }
  }

  const appliedDateRequired = Boolean(STATUS_BY_VALUE[values.status]?.requiresAppliedDate);

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

        <div className="space-y-8">
          <FormSection title="Role">
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
            <Field
              id="application-employment-type"
              label="Employment type"
              optional
              error={errorFor('employmentType')}
            >
              {(aria) => (
                <Select {...aria} {...fieldProps('employmentType')} options={EMPLOYMENT_TYPES} placeholder="Not specified" />
              )}
            </Field>
            <Field id="application-salary" label="Salary range" optional error={errorFor('salaryRange')}>
              {(aria) => (
                <TextInput
                  {...aria}
                  {...fieldProps('salaryRange')}
                  maxLength={FIELD_LIMITS.salaryRange}
                  placeholder="e.g. ₹12–15 LPA"
                />
              )}
            </Field>
            <Field id="application-source" label="Source" optional error={errorFor('source')}>
              {(aria) => (
                <Select {...aria} {...fieldProps('source')} options={APPLICATION_SOURCES} placeholder="Select a source" />
              )}
            </Field>
            <Field
              id="application-job-url"
              label="Job posting URL"
              optional
              error={errorFor('jobUrl')}
              className="sm:col-span-2"
            >
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
          </FormSection>

          <FormSection title="Progress">
            <Field id="application-status" label="Status" required error={errorFor('status')}>
              {(aria) => <Select {...aria} {...fieldProps('status')} options={APPLICATION_STATUSES} />}
            </Field>
            <Field
              id="application-applied-date"
              label="Applied date"
              required={appliedDateRequired}
              optional={!appliedDateRequired}
              hint={appliedDateRequired ? undefined : 'Leave empty if you haven’t applied.'}
              error={errorFor('appliedDate')}
            >
              {(aria) => <TextInput {...aria} {...fieldProps('appliedDate')} type="date" max={today} />}
            </Field>
            <Field
              id="application-deadline"
              label="Deadline"
              optional
              hint="Application or assessment due date."
              error={errorFor('deadline')}
            >
              {(aria) => <TextInput {...aria} {...fieldProps('deadline')} type="date" />}
            </Field>
            <Field
              id="application-interview-date"
              label="Interview"
              optional
              hint="Date and time in your local time zone."
              error={errorFor('interviewDate')}
            >
              {(aria) => <TextInput {...aria} {...fieldProps('interviewDate')} type="datetime-local" />}
            </Field>
          </FormSection>

          <FormSection title="Recruiter or contact" description="Optional — who you’re talking to about this role.">
            <Field id="application-contact-name" label="Name" error={errorFor('contact.name')}>
              {(aria) => (
                <TextInput
                  {...aria}
                  {...fieldProps('contact.name')}
                  autoComplete="off"
                  maxLength={FIELD_LIMITS.contactName}
                />
              )}
            </Field>
            <Field id="application-contact-email" label="Email" error={errorFor('contact.email')}>
              {(aria) => (
                <TextInput
                  {...aria}
                  {...fieldProps('contact.email')}
                  type="email"
                  autoComplete="off"
                  maxLength={FIELD_LIMITS.contactEmail}
                />
              )}
            </Field>
            <Field id="application-contact-phone" label="Phone" error={errorFor('contact.phone')}>
              {(aria) => (
                <TextInput
                  {...aria}
                  {...fieldProps('contact.phone')}
                  type="tel"
                  autoComplete="off"
                  maxLength={FIELD_LIMITS.contactPhone}
                />
              )}
            </Field>
          </FormSection>

          <Field
            id="application-notes"
            label="Notes"
            optional
            hint={`${values.notes.length} / ${FIELD_LIMITS.notes} characters`}
            error={errorFor('notes')}
          >
            {(aria) => (
              <Textarea
                {...aria}
                {...fieldProps('notes')}
                rows={4}
                maxLength={FIELD_LIMITS.notes}
                placeholder="Interview prep, salary expectations, next steps…"
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
