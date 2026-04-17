import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useFocusTrap(active, containerRef) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    previouslyFocused.current = typeof document !== "undefined" ? document.activeElement : null;

    const container = containerRef?.current;
    if (container && typeof container.querySelector === "function") {
      const first = container.querySelector(FOCUSABLE);
      if (first && typeof first.focus === "function") {
        try { first.focus(); } catch { /* focus can fail on detached nodes */ }
      }
    }

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const root = containerRef?.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const previous = previouslyFocused.current;
      if (previous && typeof previous.focus === "function") {
        try { previous.focus(); } catch { /* previous may have unmounted */ }
      }
    };
  }, [active, containerRef]);
}
