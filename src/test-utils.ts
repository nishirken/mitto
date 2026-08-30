import type { LitElement } from 'lit';

export const tid = <T extends Element = HTMLElement>(el: Element, id: string): T | null => {
  const selector = `[data-testid="${id}"]`;

  return (el.shadowRoot?.querySelector<T>(selector) ?? el.querySelector<T>(selector)) as T | null;
};

export const typeInto = (host: Element, value: string) => {
  const native = host.shadowRoot?.querySelector('input');

  if (!native) throw new Error(`<${host.localName}> has no inner <input> to type into`);

  native.value = value;
  native.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
};

export const settled = async (el: LitElement) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};
