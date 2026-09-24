import gsap from 'gsap';

/**
 * GSAP Animation Toolkit for Krishi-Setu UI
 */

export const fadeIn = (target, options = {}) => {
  if (!target) return;
  return gsap.fromTo(
    target,
    { opacity: 0, y: options.y ?? 15 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.5,
      delay: options.delay ?? 0,
      ease: options.ease ?? 'power2.out',
      ...options,
    }
  );
};

export const staggerIn = (targets, options = {}) => {
  if (!targets || targets.length === 0) return;
  return gsap.fromTo(
    targets,
    { opacity: 0, y: options.y ?? 20, scale: options.scale ?? 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: options.duration ?? 0.45,
      stagger: options.stagger ?? 0.08,
      ease: options.ease ?? 'power2.out',
      ...options,
    }
  );
};

export const slideUp = (target, options = {}) => {
  if (!target) return;
  return gsap.fromTo(
    target,
    { opacity: 0, y: options.distance ?? 40 },
    {
      opacity: 1,
      y: 0,
      duration: options.duration ?? 0.6,
      ease: 'back.out(1.2)',
      ...options,
    }
  );
};

export const animateProgress = (target, percent, options = {}) => {
  if (!target) return;
  return gsap.to(target, {
    width: `${Math.min(100, Math.max(0, percent))}%`,
    duration: options.duration ?? 0.8,
    ease: 'power2.out',
    ...options,
  });
};

export const pulseBadge = (target) => {
  if (!target) return;
  return gsap.fromTo(
    target,
    { scale: 0.95 },
    {
      scale: 1.05,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    }
  );
};

export const modalEnter = (target) => {
  if (!target) return;
  return gsap.fromTo(
    target,
    { opacity: 0, scale: 0.92, y: 20 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: 'back.out(1.4)',
    }
  );
};
