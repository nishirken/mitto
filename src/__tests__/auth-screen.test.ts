import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import '../components/auth-screen';
import type { AuthScreen } from '../components/auth-screen';

describe('auth-screen', () => {
  it('renders sign in title', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`);
    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Sign in');
  });

  it('renders phone input', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`);
    const input = el.shadowRoot!.querySelector('.phone-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.type).toBe('tel');
  });

  it('renders continue button', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`);
    expect(el.shadowRoot!.querySelector('.continue-btn')!.textContent).toBe('Continue');
  });
});
