# Mobile PWA QA Checklist

Manual QA checklist for unahouse.finance progressive web app behavior.

---

## 1. Install Flow

- [ ] **beforeinstallprompt** fires on Android Chrome after meeting PWA criteria
- [ ] Install dialog appears and app installs to home screen
- [ ] Home screen icon renders correctly (192x192 SVG)
- [ ] App launches in **standalone** display mode (no browser chrome)
- [ ] iOS: "Add to Home Screen" via Safari share sheet works
- [ ] iOS: no `beforeinstallprompt` is expected (Safari limitation)

## 2. Splash & Theme

- [ ] `theme_color` in manifest matches `#0f172a`
- [ ] `background_color` in manifest renders during splash
- [ ] Status bar style is `black-translucent` on iOS
- [ ] Android status bar uses theme color

## 3. Navigation

- [ ] Bottom navigation bar renders and is fully usable
- [ ] Safe-area insets respected (no content behind notch/home indicator)
- [ ] Deep links open correct pages: `/transactions`, `/cards`, `/analytics`, `/manual`, `/import`
- [ ] Hardware/swipe back navigation works without breaking SPA state
- [ ] All navigation links highlight active state correctly

## 4. Viewport & Scroll

- [ ] `viewport-fit=cover` present in rendered `<meta name="viewport">`
- [ ] `overscroll-behavior: none` prevents pull-to-refresh and rubber-banding
- [ ] No unintended horizontal scroll on any page
- [ ] `maximum-scale=1` prevents pinch-to-zoom (intentional for app-like feel)
- [ ] Content adjusts for env(safe-area-inset-*) where used

## 5. Touch Targets

- [ ] All buttons and interactive elements are at least 44x44 CSS pixels
- [ ] No overlapping tap targets
- [ ] Input fields focus correctly on mobile keyboards
- [ ] 16px minimum font size on inputs (prevents iOS auto-zoom)

## 6. Service Worker & Cache

- [ ] Service worker registers on first visit
- [ ] App shell routes are pre-cached: `/`, `/?source=pwa`, `/transactions`, `/cards`, `/analytics`, `/manual`
- [ ] `/api/*` requests are **NOT** cached (early return in fetch handler)
- [ ] Stale cache versions are cleaned up on SW activation
- [ ] Offline: app shell loads; data-dependent pages show graceful empty state
- [ ] After re-deploy, new SW activates and updates cache

## 7. Browser vs Installed Mode

- [ ] In browser: full browser chrome visible, app still functional
- [ ] In standalone: no browser chrome, status bar themed
- [ ] `display-mode: standalone` media query matches when installed
- [ ] Navigation works identically in both modes

## 8. Known Caveats

- **iOS Safari**: `beforeinstallprompt` event is not supported; users must use the share sheet to install
- **window-controls-overlay**: desktop-only feature, not applicable on mobile
- **SVG icons**: some older Android versions may not render SVG icons on splash; consider adding PNG fallbacks if issues arise
- **Offline mode**: only the app shell is available offline; transaction data requires network

## 9. Regression Test Steps

```bash
# Build must succeed with zero themeColor deprecation warnings
pnpm build

# Verify rendered HTML
# 1. Open http://localhost:3104 in Chrome
# 2. View Page Source or DevTools Elements
# 3. Confirm <meta name="viewport"> contains viewport-fit=cover
# 4. Confirm <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
# 5. Confirm NO duplicate theme-color meta from head.tsx

# DevTools checks
# Application > Manifest: verify start_url, display, theme_color, icons
# Application > Service Workers: verify active SW, no errors
# Application > Cache Storage: verify unahouse-finance-v1 contains APP_SHELL entries
# Network: verify /api/* requests bypass SW (no "(ServiceWorker)" in size column)
```
