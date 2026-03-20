import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { telegramClient } from '../telegram-client';
import type { AuthState } from '../types/telegram';

@customElement('auth-screen')
export class AuthScreen extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      padding: 16px;
    }
    .title { font-weight: 700; font-size: 16px; }
    .field { width: 200px; }
    .label { font-size: 9px; color: #555; margin-bottom: 3px; }
    .input {
      width: 100%;
      box-sizing: border-box;
      border: 1.5px solid #000;
      padding: 6px 8px;
      font-size: 12px;
      font-family: inherit;
      outline: none;
    }
    .hint { font-size: 8px; color: #555; margin-top: 3px; }
    .continue-btn {
      background: #000;
      color: #fff;
      padding: 6px 24px;
      font-size: 11px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      margin-top: 4px;
      font-family: inherit;
    }
    .continue-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .error {
      font-size: 9px;
      color: #900;
      margin-top: 4px;
    }
  `;

  @property({ type: String }) authState: AuthState = 'wait_phone';
  @state() private _phone = '';
  @state() private _code = '';
  @state() private _password = '';
  @state() private _loading = false;
  @state() private _error = '';

  private async _onSubmitPhone() {
    if (!this._phone.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await telegramClient.sendPhoneNumber(this._phone.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _onSubmitCode() {
    if (!this._code.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await telegramClient.sendAuthCode(this._code.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _onSubmitPassword() {
    if (!this._password.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await telegramClient.sendPassword(this._password.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private _renderPhone() {
    return html`
      <span class="title">Sign in</span>
      <div class="field">
        <div class="label">Phone number</div>
        <input
          class="input"
          type="tel"
          placeholder="+374 XX XXX XXXX"
          .value=${this._phone}
          @input=${(e: InputEvent) => this._phone = (e.target as HTMLInputElement).value}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._onSubmitPhone()}
        >
        <div class="hint">International format</div>
      </div>
      ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      <button class="continue-btn" ?disabled=${this._loading} @click=${this._onSubmitPhone}>
        ${this._loading ? 'Sending...' : 'Continue'}
      </button>
    `;
  }

  private _renderCode() {
    return html`
      <span class="title">Enter code</span>
      <div class="field">
        <div class="label">Authentication code</div>
        <input
          class="input"
          type="text"
          inputmode="numeric"
          placeholder="12345"
          .value=${this._code}
          @input=${(e: InputEvent) => this._code = (e.target as HTMLInputElement).value}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._onSubmitCode()}
        >
        <div class="hint">Check your Telegram app or SMS</div>
      </div>
      ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      <button class="continue-btn" ?disabled=${this._loading} @click=${this._onSubmitCode}>
        ${this._loading ? 'Verifying...' : 'Continue'}
      </button>
    `;
  }

  private _renderPassword() {
    return html`
      <span class="title">Two-factor auth</span>
      <div class="field">
        <div class="label">Password</div>
        <input
          class="input"
          type="password"
          placeholder="Password"
          .value=${this._password}
          @input=${(e: InputEvent) => this._password = (e.target as HTMLInputElement).value}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._onSubmitPassword()}
        >
      </div>
      ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      <button class="continue-btn" ?disabled=${this._loading} @click=${this._onSubmitPassword}>
        ${this._loading ? 'Verifying...' : 'Continue'}
      </button>
    `;
  }

  render() {
    switch (this.authState) {
      case 'wait_code':
        return this._renderCode();
      case 'wait_password':
        return this._renderPassword();
      default:
        return this._renderPhone();
    }
  }
}
