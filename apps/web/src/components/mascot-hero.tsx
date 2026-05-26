'use client';

import { useEffect } from 'react';
import {
  motion,
  useAnimationControls,
  useScroll,
  useTransform,
} from 'motion/react';
import Image from 'next/image';

const INITIAL = { x: '100%', y: '-20%', rotate: -15, opacity: 0 };
const REST = { x: '0%', y: '0%', rotate: 0, opacity: 1 };

// Background mascot on the right of the hero: arcs in on page load,
// slides + fades out as the user scrolls down.
export function MascotHero() {
  const { scrollY } = useScroll();
  const scrollX = useTransform(scrollY, [0, 400], ['0%', '110%']);
  const scrollOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const controls = useAnimationControls();

  useEffect(() => {
    // Entrance animation on fresh mount
    controls.start({
      x: '0%',
      y: '0%',
      rotate: [-15, 6, 0],
      opacity: 1,
      transition: {
        delay: 0.2,
        x: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 1.3, ease: [0.34, 1.56, 0.64, 1] },
        rotate: { duration: 1.3, times: [0, 0.65, 1], ease: 'easeOut' },
        opacity: { duration: 0.5, ease: 'easeOut' },
      },
    });

    // On browser back via BFCache the component isn't re-mounted, so the
    // framer `initial` state stays applied and the mascot would be stuck
    // off-screen. Snap it to rest position instead — no animation, just there.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) controls.set(REST);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [controls]);

  return (
    <motion.div
      style={{ x: scrollX, opacity: scrollOpacity }}
      className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden items-center md:flex"
      aria-hidden
    >
      <motion.div initial={INITIAL} animate={controls}>
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
