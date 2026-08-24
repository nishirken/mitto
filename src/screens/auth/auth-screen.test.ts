import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import { mockServices, mockAuthStore } from 'api/__mocks__/telegram-client';
import './auth-screen';
import type { AuthScreen } from './auth-screen';
import type { MkInput } from 'mudita-ui';
import { tid } from 'test-utils';

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: mockServices });

  return provider;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthStore.state.set('wait_phone');
});

describe('auth-screen', () => {
  it('calls sendPhoneNumber on phone submit', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });
    const input = tid<MkInput>(el, 'phone-input')!;
    const phoneNumber = '+1234567890';
    input.value = phoneNumber;
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    tid(el, 'submit')!.click();
    await el.updateComplete;

    expect(mockAuthStore.sendPhoneNumber).toHaveBeenCalledWith(phoneNumber);
  });

  it('shows code input after auth state changes to wait_code', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, {
      parentNode: withContext(),
    });

    mockAuthStore.state.set({ type: 'wait_code', isSmsAvailable: false });
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Enter code');
    expect(tid(el, 'code-input')).not.toBeNull();
  });

  it('calls sendAuthCode on code submit', async () => {
    mockAuthStore.state.set({ type: 'wait_code', isSmsAvailable: false });
    const el = await fixture<AuthScreen>(
      html`
      <auth-screen></auth-screen>
    `,
      { parentNode: withContext() },
    );

    const input = tid<MkInput>(el, 'code-input')!;
    input.value = '12345';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    const form = el.shadowRoot!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await el.updateComplete;

    expect(mockAuthStore.sendAuthCode).toHaveBeenCalledWith('12345');
  });
});
