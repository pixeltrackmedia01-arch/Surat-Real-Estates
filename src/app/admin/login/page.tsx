import { Suspense } from 'react';
import { adminConfigured } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="admin-login">
      <h1>Admin sign in</h1>
      {adminConfigured() ? (
        <Suspense>
          <LoginForm />
        </Suspense>
      ) : (
        <p className="notice notice-warn">
          Admin access is disabled because <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (16+ characters) are not
          set in the server environment.
        </p>
      )}
    </div>
  );
}
