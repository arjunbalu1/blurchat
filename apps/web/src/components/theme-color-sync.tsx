'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// next-themes toggles a `.dark` class, not prefers-color-scheme, so a static
// <meta name="theme-color"> (or a media-query'd one) can't follow the toggle.
// Sync it to the actual rendered <body> background — read as resolved rgb —
// whenever the theme changes, so the mobile browser/status-bar chrome matches
// light or dark. The static viewport.themeColor in layout.tsx is the pre-hydration
// default (dark); this corrects it once mounted and on every toggle.
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    if (!bg) return;
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = bg;
  }, [resolvedTheme]);

  return null;
}
