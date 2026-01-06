# Logo Scroll Styling Fix

## Issue
The logo on the landing page was changing appearance (becoming compressed/styled differently) when users scrolled down the page. This was caused by conditional CSS styling that applied different filters, backgrounds, and backdrop effects based on scroll state.

## Root Cause
In `apps/web/src/pages/LandingPage.jsx`, the logo container had scroll-dependent styling:
- **On scroll down**: Background became 'transparent', filter became 'none', backdrop filter was removed
- **On scroll up**: Background was 'rgba(255, 255, 255, 0.25)', filter applied drop shadow, backdrop filter active

This caused the logo to visually "compress" or change appearance mid-scroll.

## Solution
Removed scroll-state conditional CSS from the logo container. Now the logo maintains **consistent styling regardless of scroll position**:

```jsx
// BEFORE (Problematic - conditional styling)
filter: scrolled ? 'none' : 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))',
background: scrolled ? 'transparent' : 'rgba(255, 255, 255, 0.25)',
backdropFilter: scrolled ? 'none' : 'blur(8px)',

// AFTER (Fixed - always consistent)
filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))',
background: 'rgba(255, 255, 255, 0.25)',
backdropFilter: 'blur(8px)',
transition: 'all 0.3s ease', // Added smooth transition
```

## Changed Files
- `apps/web/src/pages/LandingPage.jsx` (Line 157-170)

## Testing
The logo will now:
1. Maintain its frosted glass appearance when page loads
2. Keep the same styling when user scrolls down
3. Show no jarring visual changes or compression effects
4. Animate smoothly with transition effects

## Deployment
This fix is ready to deploy with the next frontend build. The change is purely CSS-based with no logic changes.
