import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './mk-checkbox';
import type { MkCheckbox } from './mk-checkbox';

const input = (el: MkCheckbox) => el.shadowRoot!.querySelector('input')!;

describe('mk-checkbox', () => {
  it('renders the label bound to the input', async () => {
    const el = await fixture<MkCheckbox>(html`<mk-checkbox label="Paged scroll"></mk-checkbox>`);

    const label = el.shadowRoot!.querySelector('label')!;
    expect(label.textContent).toBe('Paged scroll');
    expect(label.getAttribute('for')).toBe(input(el).id);
  });

  it('reflects the checked property to the input', async () => {
    const el = await fixture<MkCheckbox>(html`<mk-checkbox .checked=${true}></mk-checkbox>`);

    expect(input(el).checked).toBe(true);
  });

  it('updates checked and emits change when toggled', async () => {
    const el = await fixture<MkCheckbox>(html`<mk-checkbox></mk-checkbox>`);
    let emitted = 0;
    el.addEventListener('change', () => emitted++);

    input(el).click();
    await el.updateComplete;

    expect(el.checked).toBe(true);
    expect(emitted).toBe(1);
  });

  it('toggles back off on a second tap', async () => {
    const el = await fixture<MkCheckbox>(html`<mk-checkbox .checked=${true}></mk-checkbox>`);

    input(el).click();
    await el.updateComplete;

    expect(el.checked).toBe(false);
  });

  it('does not emit change when disabled', async () => {
    const el = await fixture<MkCheckbox>(html`<mk-checkbox disabled></mk-checkbox>`);
    let emitted = 0;
    el.addEventListener('change', () => emitted++);

    input(el).click();
    await el.updateComplete;

    expect(el.checked).toBe(false);
    expect(emitted).toBe(0);
  });
});
