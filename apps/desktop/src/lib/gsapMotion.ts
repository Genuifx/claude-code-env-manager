import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

export const ccemMotion = {
  duration: {
    quick: 0.18,
    base: 0.28,
    handoff: 0.48,
  },
  ease: {
    standard: 'power3.out',
    soft: 'power2.out',
  },
} as const;

export function shouldReduceMotion() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function clearMotionProps(targets: Parameters<typeof gsap.set>[0]) {
  gsap.set(targets, {
    clearProps: 'opacity,visibility,transform,scale,x,y',
  });
}

export function getMotionTargets(
  root: ParentNode | null | undefined,
  selector: string,
  limit = 12,
) {
  if (!root || limit <= 0) {
    return [] as HTMLElement[];
  }

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).slice(0, limit);
}
