import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import { mockServices } from 'api/__mocks__/telegram-client';
import './auth-screen';
import type { AuthScreen } from './auth-screen';
import type { MkInput } from 'components/mk-input/mk-input';
import { tid } from 'test-utils';

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: mockServices });

  return provider;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth-screen', () => {
  it('calls sendPhoneNumber on phone submit', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, { parentNode: withContext() });
    const input = tid(el, 'phone-input') as MkInput;
    const phoneNumber = '+1234567890';
    input.value = phoneNumber;
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    (tid(el, 'submit') as HTMLElement).click();
    await el.updateComplete;

    expect(mockServices.authClient.sendPhoneNumber).toHaveBeenCalledWith(phoneNumber);
  });

  it('shows code input after auth state changes to wait_code', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`, { parentNode: withContext() });

    el.authState = 'wait_code';
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Enter code');
    expect(tid(el, 'code-input')).not.toBeNull();
  });

  it('calls sendAuthCode on code submit', async () => {
    const el = await fixture<AuthScreen>(html`
      <auth-screen authState="wait_code"></auth-screen>
    `, { parentNode: withContext() });

    const input = tid(el, 'code-input') as MkInput;
    input.value = '12345';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    (tid(el, 'submit') as HTMLElement).click();
    await el.updateComplete;

    expect(mockServices.authClient.sendAuthCode).toHaveBeenCalledWith('12345');
  });
});
