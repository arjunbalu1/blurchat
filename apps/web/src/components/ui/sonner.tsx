'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// top-center so toasts don't collide with the mobile bottom-sheet gate on /chat.
// theme follows next-themes' class-based toggle via resolvedTheme.
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'dark'}
      position="top-center"
      {...props}
    />
  );
}
