import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { authClient } from '@/lib/auth-client';

export const getSession = cache(async () => {
  try {
    const { data } = await authClient.getSession({
      fetchOptions: { headers: await headers() },
    });
    return data;
  } catch {
    return null;
  }
});
