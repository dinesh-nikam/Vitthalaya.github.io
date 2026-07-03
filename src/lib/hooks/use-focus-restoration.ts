'use client';

/**
 * Focus Restoration Hook
 * 
 * Saves the last focused element before navigation and restores focus after.
 * Critical for keyboard navigation and screen reader users.
 * Implements WCAG 2.4.3 (Focus Order) best practices.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useFocusRestoration() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);
  const lastFocusedElement = useRef<string | null>(null);

  useEffect(() => {
    // Save focused element when pathname changes
    if (pathname !== lastPathname.current) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== document.body) {
        // Create a selector for the focused element
        const selector = createElementSelector(activeElement as HTMLElement);
        if (selector) {
          lastFocusedElement.current = selector;
        }
      }
      lastPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    // Restore focus after navigation
    if (lastFocusedElement.current) {
      const selector = lastFocusedElement.current;
      lastFocusedElement.current = null;
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.focus();
        } else {
          // Fallback to main content
          const main = document.getElementById('main-content');
          main?.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);
}

/**
 * Create a unique selector for an element
 */
function createElementSelector(element: HTMLElement): string | null {
  // Try id first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try data-testid
  if (element.dataset.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }

  // Build path from element
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ') || null;
}
