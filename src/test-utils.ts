import type { LitElement } from 'lit';

export const tid = <T extends Element = HTMLElement>(el: Element, id: string): T | null => {
  const selector = `[data-testid="${id}"]`;

  return (el.shadowRoot?.querySelector<T>(selector) ?? el.querySelector<T>(selector)) as T | null;
};

export const settled = async (el: LitElement) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};
