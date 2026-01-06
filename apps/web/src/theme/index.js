import { createTheme } from '@mantine/core';
import { brandColor, successColor } from './colors.js';

const theme = createTheme({
  colors: {
    brand: brandColor,
    success: successColor,
  },
  primaryColor: 'brand',
  fontFamily: `'Inter', system-ui, -apple-system, sans-serif`,
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
      },
    },
  },
  defaultRadius: 'md',
  focusRing: 'auto',
  // removed cursorType: Mantine ignores unknown theme keys; use CSS for cursors if needed
});

export default theme;