/** Rola até o primeiro campo inválido (aria-invalid="true" ou [data-invalid]) e dá foco. */
export function focusFirstInvalid(container: HTMLElement | null): void {
  if (!container) return;
  // Espera o React aplicar os atributos de erro
  requestAnimationFrame(() => {
    const el = container.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  });
}
