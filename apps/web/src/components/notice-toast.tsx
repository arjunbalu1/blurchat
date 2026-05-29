'use client';

import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

// Fires a one-shot toast for a ?notice= redirect (e.g. a sign-in attempt with a
// provider that has no account → routed to the /chat gate). Strips the param
// via history.replaceState — NOT router.replace — so the URL is cleaned without
// a navigation/re-render that could interfere with the toast. The <Toaster>
// lives in the root layout (mounted before children, so it's subscribed before
// this fires), so the toast lands reliably.
export function NoticeToast({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast(title, {
      description,
      duration: 6000,
      icon: <Info className="size-5 text-primary" />,
    });
    window.history.replaceState(null, '', '/chat');
  }, [title, description]);

  return null;
}
