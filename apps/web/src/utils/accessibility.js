/**
 * Announces a message to screen readers using an aria-live region
 * @param {string} message - The message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  // Guard for non-browser environments
  if (typeof document === 'undefined' || !document.body) {
    return;
  }
  
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.textContent = message;
  
  document.body.appendChild(liveRegion);
  
  setTimeout(() => {
    if (document.body && document.body.contains(liveRegion)) {
      document.body.removeChild(liveRegion);
    }
  }, 1000);
}

/**
 * Gets all focusable elements within a container
 * @param {HTMLElement} container - The container element
 * @returns {NodeList} List of focusable elements
 */
export function getFocusableElements(container) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  
  return container.querySelectorAll(focusableSelectors.join(','));
}

/**
 * Traps focus within a container element
 * @param {HTMLElement} container - The container element
 * @returns {Function} Cleanup function
 */
export function trapFocus(container) {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Generates consistent ARIA labels based on context
 * @param {string} context - The context (e.g., 'booking', 'prescription')
 * @param {string} action - The action (e.g., 'view', 'create', 'delete')
 * @returns {string} ARIA label
 */
export function getAriaLabel(context, action) {
  const labels = {
    booking: {
      view: 'View booking details',
      create: 'Create new booking',
      cancel: 'Cancel booking',
      edit: 'Edit booking',
    },
    prescription: {
      view: 'View prescription details',
      create: 'Create new prescription',
      delete: 'Delete prescription',
      fulfill: 'Fulfill prescription',
    },
    document: {
      view: 'View document',
      upload: 'Upload document',
      delete: 'Delete document',
      download: 'Download document',
    },
    referral: {
      view: 'View referral details',
      create: 'Create new referral',
      accept: 'Accept referral',
      reject: 'Reject referral',
    },
  };
  
  return labels[context]?.[action] || `${action} ${context}`;
}

// ARIA role constants
export const ARIA_ROLES = {
  ALERT: 'alert',
  BUTTON: 'button',
  DIALOG: 'dialog',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  REGION: 'region',
  STATUS: 'status',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
};

// ARIA state constants
export const ARIA_STATES = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  BUSY: 'aria-busy',
  CURRENT: 'aria-current',
};

// ARIA property constants
export const ARIA_PROPERTIES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  MODAL: 'aria-modal',
};
