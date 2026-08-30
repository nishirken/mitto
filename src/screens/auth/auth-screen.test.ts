import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { createMockServices } from 'api/__mocks__/services-context';
import { MockAuthStore } from 'screens/auth/__mocks__/auth-store';
import type { WaitCodeState } from './auth-store';
import './auth-screen';
import type { AuthScreen } from './auth-screen';
import type { MkInput } from 'mudita-ui';
import { settled, tid, typeInto } from 'test-utils';

let authStore: MockAuthStore;
let services: Services;

function waitCode(overrides: Partial<WaitCodeState> = {}): WaitCodeState {
  return {
    type: 'wait_code',
    codeType: 'app',
    codeLength: 5,
    nextType: null,
    beginning: null,
    fragmentUrl: null,
    ...overrides,
  };
}

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

beforeEach(() => {
  vi.clearAllMocks();
  authStore = new MockAuthStore();
  services = createMockServices({ authStore });
  authStore.state.set('wait_phone');
});

describe('auth-screen', () => {
  it('calls sendCode on phone submit', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });
    const phoneNumber = '+1234567890';
    typeInto(tid(el, 'phone-input')!, phoneNumber);
    await el.updateComplete;

    tid(el, 'submit')!.click();
    await el.updateComplete;

    expect(authStore.sendCode).toHaveBeenCalledWith(phoneNumber);
  });

  it('shows code input after auth state changes to wait_code', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    authStore.state.set(waitCode());
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Enter code');
    expect(tid(el, 'code-input')).not.toBeNull();
  });

  it('hints at the delivery channel and offers no resend without nextType', async () => {
    authStore.state.set(waitCode({ codeType: 'sms' }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    expect(tid<MkInput>(el, 'code-input')!.getAttribute('hint')).toBe('Check your SMS');
    expect(tid(el, 'resend')).toBeNull();
  });

  it('labels the resend button after nextType', async () => {
    authStore.state.set(waitCode({ nextType: 'call' }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    const resend = tid(el, 'resend')!;
    expect(resend.textContent!.trim()).toBe('Get code by phone call');

    resend.click();
    await el.updateComplete;

    expect(authStore.resendCode).toHaveBeenCalled();
  });

  it('shows the word beginning in the hint', async () => {
    authStore.state.set(waitCode({ codeType: 'word', codeLength: null, beginning: 'a' }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    expect(tid<MkInput>(el, 'code-input')!.getAttribute('hint')).toBe('Check your SMS for "a…"');
  });

  it('links to Fragment when the code is delivered there', async () => {
    const url = 'https://fragment.com/number/8881234/code';
    authStore.state.set(waitCode({ codeType: 'fragment', fragmentUrl: url }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    const link = tid(el, 'fragment-link')!;
    expect(link.getAttribute('href')).toBe(url);
    expect(link.textContent!.trim()).toBe(url);
  });

  it('has no Fragment link for other code types', async () => {
    authStore.state.set(waitCode({ codeType: 'sms' }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    expect(tid(el, 'code-input')).not.toBeNull();
    expect(tid(el, 'fragment-link')).toBeNull();
  });

  it('drops the length constraint for word codes', async () => {
    authStore.state.set(waitCode({ codeType: 'word', codeLength: null }));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    const input = tid<MkInput>(el, 'code-input')!;
    expect(input.getAttribute('type')).toBe('text');
    expect(input.hasAttribute('maxlength')).toBe(false);
  });

  it('forwards autocomplete hints to the native inputs', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });
    const nativeOf = (id: string) =>
      tid(el, id)!.shadowRoot!.querySelector('input')!.getAttribute('autocomplete');

    expect(nativeOf('phone-input')).toBe('tel');

    authStore.state.set(waitCode());
    await el.updateComplete;
    expect(nativeOf('code-input')).toBe('one-time-code');

    authStore.state.set({ type: 'wait_password', hint: null });
    await el.updateComplete;
    expect(nativeOf('password-input')).toBe('current-password');
  });

  it('announces errors to assistive technology', async () => {
    authStore.state.set(waitCode());
    authStore.signIn.mockRejectedValueOnce(new Error('Invalid code'));
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    typeInto(tid(el, 'code-input')!, '12345');
    await el.updateComplete;
    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settled(el);

    const error = el.shadowRoot!.querySelector('.error')!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Invalid code');
  });

  it('renders a masked password field with the account hint', async () => {
    authStore.state.set({ type: 'wait_password', hint: 'my cat name' });
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    const input = tid<MkInput>(el, 'password-input')!;
    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Enter password');
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('hint')).toBe('my cat name');
  });

  it('falls back to a generic hint when the account has none', async () => {
    authStore.state.set({ type: 'wait_password', hint: null });
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    expect(tid<MkInput>(el, 'password-input')!.getAttribute('hint')).toBe(
      'Two-step verification is enabled',
    );
  });

  it('calls checkPassword on password submit', async () => {
    authStore.state.set({ type: 'wait_password', hint: null });
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    typeInto(tid(el, 'password-input')!, 'hunter2');
    await el.updateComplete;

    el.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await el.updateComplete;

    expect(authStore.checkPassword).toHaveBeenCalledWith('hunter2');
  });

  it('offers a retry in the error state', async () => {
    authStore.state.set('error');
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    const retry = tid(el, 'retry')!;
    expect(retry).not.toBeNull();

    retry.click();
    await el.updateComplete;

    expect(authStore.checkAuthorization).toHaveBeenCalled();
  });

  it('calls signIn on code submit', async () => {
    authStore.state.set(waitCode());
    const el = await fixture<AuthScreen>(
      html`
      <auth-screen></auth-screen>
    `,
      { parentNode: withContext() },
    );

    typeInto(tid(el, 'code-input')!, '12345');
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await el.updateComplete;

    expect(authStore.signIn).toHaveBeenCalledWith('12345');
  });
});
