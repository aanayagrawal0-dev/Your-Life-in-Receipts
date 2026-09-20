import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia — polyfill it so components that check
// prefers-reduced-motion / prefers-color-scheme etc. don't crash under test.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom doesn't implement scrollIntoView (used by the site's scroll-based
// section navigation, now that routing was replaced with one continuous
// scroll) or IntersectionObserver (used to track which section is active).
// Both are no-ops under test — jsdom has no real layout/scrolling engine.
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom doesn't implement ResizeObserver either (used by CrowdBand to lay
// out avatars against its container's measured width).
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
