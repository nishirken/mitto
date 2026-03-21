import { LitElement } from 'lit';

export const tid = (el: LitElement, id: string) =>
  el.shadowRoot!.querySelector(`[data-testid="${id}"]`);
