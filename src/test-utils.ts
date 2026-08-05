import { LitElement } from 'lit';

export const tid = (el: LitElement, id: string) =>
  el.shadowRoot!.querySelector(`[data-testid="${id}"]`);

export const settled = async (el: LitElement) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};
