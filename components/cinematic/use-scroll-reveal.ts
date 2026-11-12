import * as React from 'react';

/**
 * IntersectionObserver-based scroll reveal hook.
 * Adds `.dp-act-hidden` on mount, removes it and adds `.dp-act-visible`
 * when the element enters the viewport. Respects prefers-reduced-motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.12,
  rootMargin = '0px 0px -60px 0px',
) {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If reduced motion preference, reveal immediately without animation
    const pref = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (pref.matches) {
      el.classList.remove('dp-act-hidden');
      return;
    }

    el.classList.add('dp-act-hidden');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('dp-act-hidden');
          el.classList.add('dp-act-visible');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}
