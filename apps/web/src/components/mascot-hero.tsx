'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  motion,
  useAnimate,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import Image from 'next/image';

// All mascots share one "seen this session" flag — they all animate together
// on first visit and all snap to rest on return.
const STORAGE_KEY = 'mascots-seen';

const REST = { x: '0%', y: '0%', rotate: 0, opacity: 1 };

const ENTRANCE_TRANSITION = {
  delay: 0.2,
  x: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
  y: { duration: 1.3, ease: [0.34, 1.56, 0.64, 1] },
  rotate: { duration: 1.3, times: [0, 0.65, 1], ease: 'easeOut' },
  opacity: { duration: 0.5, ease: 'easeOut' },
} as const;

type EnterFrom = 'right' | 'left' | 'top' | 'bottom';

const INITIAL_BY_DIRECTION: Record<
  EnterFrom,
  { x: string; y: string; rotate: number }
> = {
  right: { x: '100%', y: '-20%', rotate: -15 },
  left: { x: '-100%', y: '-20%', rotate: 15 },
  top: { x: '0%', y: '-100%', rotate: -10 },
  bottom: { x: '0%', y: '100%', rotate: 10 },
};

interface MascotProps {
  src: string;
  width: number;
  height: number;
  /** Tailwind classes for the outer wrapper — position, flex alignment, etc. */
  containerClassName?: string;
  /** Tailwind classes for the <Image> — size, opacity/blur breakpoints. */
  imageClassName?: string;
  /** Off-screen direction the mascot enters from. Defaults to 'right'. */
  enterFrom?: EnterFrom;
  /** Direction the mascot slides off-screen as user scrolls past. Defaults to match enterFrom. */
  scrollOutTo?: 'right' | 'left';
  /** LCP hint — use only for the most prominent above-the-fold mascot. */
  priority?: boolean;
}

// Generic mascot — absolutely positioned, sliding entrance from off-screen with
// a curve + rotation overshoot, fades out as the user scrolls past it.
//
// Animation policy (shared across all mascots on the page):
//   - Entrance plays ONCE per tab session (sessionStorage flag)
//   - Re-plays on refresh (Performance API navigation type === 'reload')
//   - Snaps to rest on SPA back-nav within the same session
//   - Snaps on BFCache restore (pageshow.persisted)
//   - Respects `prefers-reduced-motion` — no entrance, no scroll-out
export function Mascot({
  src,
  width,
  height,
  containerClassName,
  imageClassName,
  enterFrom = 'right',
  scrollOutTo,
  priority = false,
}: MascotProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Per-element scroll progress — 0 as the mascot enters the viewport from
  // bottom, 1 when it has fully scrolled past the top. Lets each mascot fade
  // based on its own position rather than global page scroll (which would
  // pre-fade everything below the fold before the user could see it).
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const exitDirection = scrollOutTo ?? (enterFrom === 'left' ? 'left' : 'right');
  const exitX = exitDirection === 'left' ? '-110%' : '110%';
  const scrollX = useTransform(scrollYProgress, [0.5, 0.7], ['0%', exitX]);
  const scrollOpacity = useTransform(scrollYProgress, [0.5, 0.7], [1, 0]);

  const [scope, animate] = useAnimate();

  const initial = useMemo(() => {
    const { x, y, rotate } = INITIAL_BY_DIRECTION[enterFrom];
    return { x, y, rotate, opacity: 0 };
  }, [enterFrom]);

  useEffect(() => {
    const navEntry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === 'reload';
    const seen = sessionStorage.getItem(STORAGE_KEY) !== null;
    const shouldSkipEntrance = Boolean(reducedMotion) || (seen && !isReload);

    if (shouldSkipEntrance) {
      animate(scope.current, REST, { duration: 0 });
      return;
    }

    const startRotate = INITIAL_BY_DIRECTION[enterFrom].rotate;
    const overshoot = -startRotate * 0.4;
    animate(
      scope.current,
      {
        x: '0%',
        y: '0%',
        rotate: [startRotate, overshoot, 0],
        opacity: 1,
      },
      ENTRANCE_TRANSITION
    );
    sessionStorage.setItem(STORAGE_KEY, '1');

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) animate(scope.current, REST, { duration: 0 });
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [animate, scope, reducedMotion, enterFrom]);

  return (
    <motion.div
      ref={containerRef}
      style={reducedMotion ? undefined : { x: scrollX, opacity: scrollOpacity }}
      className={`pointer-events-none absolute -z-10 select-none ${containerClassName ?? ''}`}
      aria-hidden
    >
      <motion.div ref={scope} initial={initial}>
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          priority={priority}
          className={`object-contain ${imageClassName ?? ''}`}
        />
      </motion.div>
    </motion.div>
  );
}

// Background mascot pinned to the right of the hero. Visible on every viewport
// (scaled down via the size clamp); dimmed + blurred below xl so it doesn't
// compete with content on narrower screens.
export function MascotHero() {
  return (
    <Mascot
      src="/mascots/orange.png"
      width={615}
      height={615}
      containerClassName="inset-y-0 right-0 flex items-center"
      imageClassName="size-[clamp(140px,46vw,615px)] opacity-30 blur-[2px] xl:opacity-100 xl:blur-none"
      enterFrom="right"
      priority
    />
  );
}
