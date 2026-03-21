import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';

vi.mock('../telegram-client');

import './auth-screen';
import type { AuthScreen } from './auth-screen';
import { telegramClient } from '../telegram-client';
import { tid } from '../test-utils';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth-screen', () => {
  it('calls sendPhoneNumber on phone submit', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`);
    const input = tid(el, 'phone-input') as HTMLInputElement;
    const phoneNumber = '+1234567890';
    input.value = phoneNumber;
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    (tid(el, 'submit') as HTMLButtonElement).click();
    await el.updateComplete;

    expect(telegramClient.sendPhoneNumber).toHaveBeenCalledWith(phoneNumber);
  });

  it('shows code input after auth state changes to wait_code', async () => {
    const el = await fixture<AuthScreen>(html`<auth-screen></auth-screen>`);

    el.authState = 'wait_code';
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.title')!.textContent).toBe('Enter code');
    expect(tid(el, 'code-input')).not.toBeNull();
  });

  it('calls sendAuthCode on code submit', async () => {
    const el = await fixture<AuthScreen>(html`
      <auth-screen authState="wait_code"></auth-screen>
    `);

    const input = tid(el, 'code-input') as HTMLInputElement;
    input.value = '12345';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;

    (tid(el, 'submit') as HTMLButtonElement).click();
    await el.updateComplete;

    expect(telegramClient.sendAuthCode).toHaveBeenCalledWith('12345');
  });
});
