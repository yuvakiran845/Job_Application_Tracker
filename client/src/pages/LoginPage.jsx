import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, PasswordInput, TextInput } from '../components/ui/Field';
import { useAuth } from '../hooks/useAuth';
import { getSafeRedirect, validateLogin } from '../utils/authValidation';

const NOTICES = {
  expired: 'Your session has ended. Please sign in again.',
  'signed-out': 'You’ve been signed out.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const formRef = useRef(null);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const next = searchParams.get('next');
  const notice = NOTICES[location.state?.reason];

  function update(field) {
    return (event) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
      if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const validationErrors = validateLogin(values);
    setErrors(validationErrors);
    setFormError('');
    const firstInvalid = Object.keys(validationErrors)[0];
    if (firstInvalid) {
      formRef.current.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(getSafeRedirect(next), { replace: true });
    } catch (error) {
      setFormError(error.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Pick up where you left off.</p>

      {notice && !formError && (
        <Alert className="mt-5" role="status">
          {notice}
        </Alert>
      )}
      {formError && (
        <Alert variant="error" role="alert" className="mt-5">
          {formError}
        </Alert>
      )}

      <form ref={formRef} noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Field id="login-email" label="Email" error={errors.email}>
          {(aria) => (
            <TextInput
              {...aria}
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={update('email')}
              autoFocus
            />
          )}
        </Field>
        <Field id="login-password" label="Password" error={errors.password}>
          {(aria) => (
            <PasswordInput
              {...aria}
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={update('password')}
            />
          )}
        </Field>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to CareerFlow?{' '}
        <Link
          to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
