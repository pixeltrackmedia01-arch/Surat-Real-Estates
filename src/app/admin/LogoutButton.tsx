'use client';

import { usePathname, useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  if (usePathname() === '/admin/login') return null;
  return (
    <button
      type="button"
      className="linklike small"
      onClick={async () => {
        await fetch('/api/admin/login', { method: 'DELETE' });
        router.replace('/admin/login');
      }}
    >
      Sign out
    </button>
  );
}
