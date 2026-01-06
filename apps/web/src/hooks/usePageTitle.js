import { useEffect, useRef } from 'react';

export function usePageTitle(title, skipAnnouncement = false) {
  const previousTitle = useRef(typeof document !== 'undefined' ? document.title : '');

  useEffect(() => {
    // Guard for non-browser environments
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    const fullTitle = title ? `${title} - ArogyaFirst` : 'ArogyaFirst';
    document.title = fullTitle;

    // Announce page change to screen readers only if not skipped
    if (!skipAnnouncement) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = `Navigated to ${title || 'ArogyaFirst'}`;
      document.body.appendChild(liveRegion);

      setTimeout(() => {
        if (document.body && document.body.contains(liveRegion)) {
          document.body.removeChild(liveRegion);
        }
      }, 1000);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.title = previousTitle.current;
      }
    };
  }, [title, skipAnnouncement]);
}
