import { useEffect, useRef } from "react";

/**
 * Radix (Tabs/Collapsible) aponta aria-controls para o painel mesmo quando ele não
 * está montado. Remove o atributo enquanto o id não existir no DOM e o recoloca
 * quando o painel aparece (axe: aria-valid-attr-value).
 */
export function useAriaControlsGuard<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const sync = () => {
      const id = el.getAttribute("aria-controls") || el.dataset.ariaControls;
      if (!id) return;
      el.dataset.ariaControls = id;
      const exists = !!document.getElementById(id);
      if (exists && el.getAttribute("aria-controls") !== id) el.setAttribute("aria-controls", id);
      if (!exists && el.hasAttribute("aria-controls")) el.removeAttribute("aria-controls");
    };
    sync();
    const obs = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    });
    obs.observe(el, { attributes: true, attributeFilter: ["data-state", "aria-controls"] });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}
