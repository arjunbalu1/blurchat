'use client';

import { useEffect } from 'react';
import { motion, useAnimate, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';

const STORAGE_KEY = 'mascot-hero-seen';
const INITIAL = { x: '100%', y: '-20%', rotate: -15, opacity: 0 };
const REST = { x: '0%', y: '0%', rotate: 0, opacity: 1 };
const ENTRANCE_TARGET = {
  x: '0%',
  y: '0%',
  rotate: [-15, 6, 0],
  opacity: 1,
} as const;
const ENTRANCE_TRANSITION = {
  delay: 0.2,
  x: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
  y: { duration: 1.3, ease: [0.34, 1.56, 0.64, 1] },
  rotate: { duration: 1.3, times: [0, 0.65, 1], ease: 'easeOut' },
  opacity: { duration: 0.5, ease: 'easeOut' },
} as const;

// Background mascot on the right of the hero: arcs in on page load,
// slides + fades out as the user scrolls down.
//
// Animation policy: play the entrance ONCE per tab session.
//   - Fresh visit            → animate
//   - Refresh (F5 / Cmd+R)   → animate (Performance API says navigationType === 'reload')
//   - SPA back-nav within tab → snap to rest, no animation
//   - New tab                → animate (sessionStorage is per-tab and resets)
//
// This avoids the mascot re-doing its big entrance every time the user
// taps back to home, while still re-playing on explicit reload.
export function MascotHero() {
  const { scrollY } = useScroll();
  const scrollX = useTransform(scrollY, [0, 400], ['0%', '110%']);
  const scrollOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const navEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === 'reload';
    const seen = sessionStorage.getItem(STORAGE_KEY);

    if (seen && !isReload) {
      // Back-nav within the same tab session → snap, no animation.
      animate(scope.current, REST, { duration: 0 });
    } else {
      // First time this session OR an explicit refresh → play entrance.
      animate(scope.current, ENTRANCE_TARGET, ENTRANCE_TRANSITION);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }

    // Defense-in-depth for browser BFCache restores: BFCache preserves the
    // DOM but the framer `initial` state may stick if the previous animation
    // hadn't completed. Snap to rest to guarantee in-position.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) animate(scope.current, REST, { duration: 0 });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [animate, scope]);

  return (
    <motion.div
      style={{ x: scrollX, opacity: scrollOpacity }}
      className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden items-center md:flex"
      aria-hidden
    >
      <motion.div ref={scope} initial={INITIAL}>
        <Image
          src="/mascot-hero.png"
          alt=""
          width={615}
          height={615}
          priority
          className="size-[clamp(307px,46vw,615px)] object-contain"
        />
      </motion.div>
    </motion.div>
  );
}
