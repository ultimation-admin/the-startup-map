/**
 * Inline script content that patches removeChild and insertBefore
 * BEFORE React hydration begins. This prevents the
 * "Cannot read properties of null (reading 'removeChild')" error
 * caused by MapLibre GL, Clerk, and other libraries that manipulate
 * the DOM outside of React's control.
 *
 * This must run as a blocking <script> in <head> or at the very
 * top of <body>, NOT as a "use client" component (which loads
 * async and is too late).
 */
export const SAFE_DOM_GUARD_SCRIPT = `
(function() {
  if (typeof window === 'undefined' || window.__safe_dom_guarded__) return;
  window.__safe_dom_guarded__ = true;

  // 1. Global error interceptor to prevent unhandled removeChild/insertBefore crashes
  window.addEventListener('error', function(event) {
    var msg = (event && (event.message || (event.error && event.error.message))) || '';
    if (typeof msg === 'string' && (msg.indexOf('removeChild') !== -1 || msg.indexOf('insertBefore') !== -1)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(event) {
    var msg = (event && event.reason && (event.reason.message || String(event.reason))) || '';
    if (typeof msg === 'string' && (msg.indexOf('removeChild') !== -1 || msg.indexOf('insertBefore') !== -1)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      return true;
    }
  }, true);

  // 2. Filter out console.error noise caused by React DOM fiber unmounting
  if (typeof console !== 'undefined' && console.error) {
    var origConsoleError = console.error;
    console.error = function() {
      var firstArg = arguments[0];
      if (typeof firstArg === 'string' && (firstArg.indexOf('removeChild') !== -1 || firstArg.indexOf('insertBefore') !== -1)) {
        return;
      }
      if (firstArg instanceof Error && firstArg.message && (firstArg.message.indexOf('removeChild') !== -1 || firstArg.message.indexOf('insertBefore') !== -1)) {
        return;
      }
      return origConsoleError.apply(this, arguments);
    };
  }

  // 3. Patch DOM prototypes safely
  function patchRemoveChild(proto) {
    if (!proto || !proto.removeChild) return;
    var original = proto.removeChild;
    proto.removeChild = function(child) {
      if (!child) return child;
      if (!this) return child;
      try {
        if (child.parentNode !== this) {
          if (child.parentNode && typeof child.parentNode.removeChild === 'function') {
            try {
              return child.parentNode.removeChild(child);
            } catch (_) {
              return child;
            }
          }
          return child;
        }
        return original.call(this, child);
      } catch (e) {
        return child;
      }
    };
  }

  function patchInsertBefore(proto) {
    if (!proto || !proto.insertBefore) return;
    var original = proto.insertBefore;
    proto.insertBefore = function(newNode, refNode) {
      if (!this) return newNode;
      try {
        if (refNode && refNode.parentNode && refNode.parentNode !== this) {
          if (typeof refNode.parentNode.insertBefore === 'function') {
            try {
              return refNode.parentNode.insertBefore(newNode, refNode);
            } catch (_) {
              return newNode;
            }
          }
        }
        return original.call(this, newNode, refNode);
      } catch (e) {
        try {
          return this.appendChild(newNode);
        } catch (_) {
          return newNode;
        }
      }
    };
  }

  patchRemoveChild(Node.prototype);
  patchRemoveChild(Element.prototype);
  patchInsertBefore(Node.prototype);
  patchInsertBefore(Element.prototype);
})();
`;
