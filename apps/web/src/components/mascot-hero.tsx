'use client';

import { useEffect } from 'react';
import { motion, useAnimate, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';

const INITIAL = { x: '100%', y: '-20%', rotate: -15, opacity: 0 };
const REST = { x: '0%', y: '0%', rotate: 0, opacity: 1 };

// Background mascot on the right of the hero: arcs in on page load,
// slides + fades out as the user scrolls down.
export function MascotHero() {
  const { scrollY } = useScroll();
  const scrollX = useTransform(scrollY, [0, 400], ['0%', '110%']);
  const scrollOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    // Entrance animation on fresh mount
    animate(
      scope.current,
      {
        x: '0%',
        y: '0%',
        rotate: [-15, 6, 0],
        opacity: 1,
      },
      {
        delay: 0.2,
        x: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 1.3, ease: [0.34, 1.56, 0.64, 1] },
        rotate: { duration: 1.3, times: [0, 0.65, 1], ease: 'easeOut' },
        opacity: { duration: 0.5, ease: 'easeOut' },
      }
    );

    // Defense-in-depth for browser BFCache restores (pageshow.persisted):
    // BFCache preserves the DOM, but if the framer `initial` state stays
    // applied the mascot would be stuck off-screen. Snap it to rest — no
    // animation, just there. Normal Next App Router back-nav re-mounts and
    // re-runs the entrance via useEffect.
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
