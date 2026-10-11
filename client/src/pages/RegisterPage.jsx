import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, PasswordInput, TextInput } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { PASSWORD_MIN, getSafeRedirect, validateRegistration } from '../utils/authValidation';

const FIELD_ORDER = ['name', 'email', 'password'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef(null);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next');

  function update(field) {
    return (event) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
      if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  function focusFirst(fieldErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) formRef.current.elements.namedItem(first)?.focus();
    return Boolean(first);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);
    setFormError('');
    if (focusFirst(validationErrors)) return;

    setSubmitting(true);
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      navigate(getSafeRedirect(next), { replace: true });
    } catch (error) {
      // Field errors from the API (e.g. email already registered) go next to the field.
      if (error.fieldErrors && focusFirst(error.fieldErrors)) {
        setErrors(error.fieldErrors);
      } else {
        setFormError(error.message || 'Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">Start organizing your job search in under a minute.</p>

      {formError && (
        <Alert variant="error" role="alert" className="mt-5">
          {formError}
        </Alert>
      )}

      <form ref={formRef} noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Field id="register-name" label="Name" error={errors.name}>
          {(aria) => (
            <TextInput
              {...aria}
              name="name"
              autoComplete="name"
              maxLength={80}
              value={values.name}
              onChange={update('name')}
              autoFocus
            />
          )}
        </Field>
        <Field id="register-email" label="Email" error={errors.email}>
          {(aria) => (
            <TextInput {...aria} name="email" type="email" autoComplete="email" value={values.email} onChange={update('email')} />
          )}
        </Field>
        <Field
          id="register-password"
          label="Password"
          hint={`At least ${PASSWORD_MIN} characters. A short phrase is easy to remember and hard to guess.`}
          error={errors.password}
        >
          {(aria) => (
            <PasswordInput
              {...aria}
              name="password"
              autoComplete="new-password"
              maxLength={64}
              value={values.password}
              onChange={update('password')}
            />
          )}
        </Field>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
