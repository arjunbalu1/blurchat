'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Fires a one-shot toast for a ?notice= redirect (e.g. a sign-in attempt with a
// provider that has no account → routed to the /chat gate). Strips the param
// via history.replaceState — NOT router.replace — so the URL is cleaned without
// a navigation/re-render that could interfere with the toast. The <Toaster>
// lives in the root layout, so the toast persists regardless.
export function NoticeToast({ message }: { message: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast(message);
    window.history.replaceState(null, '', '/chat');
  }, [message]);

  return null;
}
