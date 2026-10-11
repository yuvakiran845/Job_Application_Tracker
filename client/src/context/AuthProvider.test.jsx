import { describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '../hooks/useAuth';
import { createQueryClient } from '../queryClient';
import { KNOWN_PASSWORD, KNOWN_USER, createFakeAuthService } from '../test/fakeAuthService';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';

function Controls() {
  const { status, user, logout, login } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.email ?? 'none'}</p>
      <button type="button" onClick={() => logout()}>
        log out
      </button>
      <button type="button" onClick={() => login({ email: KNOWN_USER.email, password: KNOWN_PASSWORD })}>
        log in
      </button>
    </div>
  );
}

describe('AuthProvider cache isolation', () => {
  it("empties the data cache when the user signs out, so the next user never sees it", async () => {
    const queryClient = createQueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider service={createFakeAuthService({ signedIn: true })} enabled>
            <Controls />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(`user: ${KNOWN_USER.email}`)).toBeTruthy();
    // Data loaded while signed in…
    queryClient.setQueryData(['applications', 'list', {}], { items: [{ id: 'secret', company: 'Private Co' }] });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'log out' }));
    await screen.findByText('status: unauthenticated');
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0));

    // Data cached while signed out (e.g. a stray request) is also gone once someone signs in.
    queryClient.setQueryData(['applications', 'list', {}], { items: [] });
    await user.click(screen.getByRole('button', { name: 'log in' }));
    await screen.findByText(`user: ${KNOWN_USER.email}`);
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0));
  });
});
