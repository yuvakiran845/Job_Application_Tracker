import { useId, useRef, useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, PasswordInput, TextInput } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PASSWORD_MIN, validatePasswordChange, validateProfile } from '../utils/authValidation';

/**
 * Shared submit flow for the account forms: client validation, a single request
 * at a time, API field errors shown next to their fields, other errors on top.
 */
function useAccountForm({ fieldOrder, validate, submit }) {
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function focusFirst(fieldErrors) {
    const first = fieldOrder.find((field) => fieldErrors[field]);
    if (first) formRef.current?.elements.namedItem(first)?.focus();
    return Boolean(first);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const validationErrors = validate();
    setErrors(validationErrors);
    setFormError('');
    if (focusFirst(validationErrors)) return;

    setSubmitting(true);
    try {
      await submit();
    } catch (error) {
      if (error.fieldErrors && focusFirst(error.fieldErrors)) setErrors(error.fieldErrors);
      else setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const clearError = (field) => setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  return { formRef, errors, formError, submitting, handleSubmit, clearError };
}

function ProfileForm({ user }) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const titleId = useId();
  const [values, setValues] = useState({ name: user.name, email: user.email, currentPassword: '' });
  const emailChanged = values.email.trim().toLowerCase() !== user.email;
  const changed = values.name.trim() !== user.name || emailChanged;

  const { formRef, errors, formError, submitting, handleSubmit, clearError } = useAccountForm({
    fieldOrder: ['name', 'email', 'currentPassword'],
    validate: () => validateProfile(values, { emailChanged }),
    submit: async () => {
      const changes = { name: values.name.trim() };
      if (emailChanged) Object.assign(changes, { email: values.email.trim(), currentPassword: values.currentPassword });
      const updated = await updateProfile(changes);
      setValues({ name: updated.name, email: updated.email, currentPassword: '' });
      toast({ title: 'Profile updated', description: emailChanged ? `Your email is now ${updated.email}.` : undefined });
    },
  });

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader titleId={titleId} title="Profile" description="Your name and the email you sign in with." />
      <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-5">
        {formError && (
          <Alert variant="error" role="alert">
            {formError}
          </Alert>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="profile-name" label="Name" error={errors.name}>
            {(aria) => (
              <TextInput {...aria} name="name" autoComplete="name" maxLength={80} value={values.name} onChange={update('name')} />
            )}
          </Field>
          <Field id="profile-email" label="Email" error={errors.email}>
            {(aria) => (
              <TextInput {...aria} name="email" type="email" autoComplete="email" value={values.email} onChange={update('email')} />
            )}
          </Field>
          {emailChanged && (
            <Field
              id="profile-current-password"
              label="Current password"
              hint="Required to change your email."
              error={errors.currentPassword}
              className="sm:col-span-2"
            >
              {(aria) => (
                <PasswordInput
                  {...aria}
                  name="currentPassword"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={update('currentPassword')}
                />
              )}
            </Field>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={submitting} disabled={!changed}>
            {submitting ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const titleId = useId();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });

  const { formRef, errors, formError, submitting, handleSubmit, clearError } = useAccountForm({
    fieldOrder: ['currentPassword', 'newPassword'],
    validate: () => validatePasswordChange(values),
    submit: async () => {
      await changePassword(values);
      setValues({ currentPassword: '', newPassword: '' });
      toast({ title: 'Password changed', description: 'You’ve been signed out on your other devices.' });
    },
  });

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        titleId={titleId}
        title="Password"
        description="Changing your password signs you out on every other device."
      />
      <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-5">
        {formError && (
          <Alert variant="error" role="alert">
            {formError}
          </Alert>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="password-current" label="Current password" error={errors.currentPassword}>
            {(aria) => (
              <PasswordInput
                {...aria}
                name="currentPassword"
                autoComplete="current-password"
                value={values.currentPassword}
                onChange={update('currentPassword')}
              />
            )}
          </Field>
          <Field
            id="password-new"
            label="New password"
            hint={`At least ${PASSWORD_MIN} characters.`}
            error={errors.newPassword}
          >
            {(aria) => (
              <PasswordInput
                {...aria}
                name="newPassword"
                autoComplete="new-password"
                maxLength={64}
                value={values.newPassword}
                onChange={update('newPassword')}
              />
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            {submitting ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AccountPage() {
  const { user, enabled } = useAuth();

  if (!enabled) {
    return (
      <Card>
        <EmptyState
          icon={UserRound}
          title="Accounts aren’t available with sample data"
          description="Run the app with the API (VITE_DATA_SOURCE=api) to create an account and manage it here."
          className="py-16"
        />
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <KeyRound className="size-4 text-slate-400" aria-hidden="true" />
        Signed in as <span className="font-medium text-slate-900">{user.email}</span>
      </p>
      {/* Keyed by user so the form resets if the account details change elsewhere. */}
      <ProfileForm key={`${user.name}|${user.email}`} user={user} />
      <PasswordForm />
    </div>
  );
}
