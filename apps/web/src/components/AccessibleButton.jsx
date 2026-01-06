import { forwardRef } from 'react';
import { Button } from '@mantine/core';

export const AccessibleButton = forwardRef(
  (
    {
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      loading,
      loadingText = 'Loading...',
      replaceLabelOnLoading = false,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        role="button"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-busy={loading}
        loading={loading}
        onClick={onClick}
        {...props}
      >
        {loading && replaceLabelOnLoading ? loadingText : children}
        {loading && !replaceLabelOnLoading && <span className="sr-only">{loadingText}</span>}
      </Button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
