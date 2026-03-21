import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ApiClient } from 'api/api-client';
import type { AuthState } from 'types/telegram';

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

  @property({ attribute: false }) client!: ApiClient;
  @property({ type: String }) authState: AuthState = 'wait_phone';
  @state() private _phone = '';
  @state() private _code = '';
  @state() private _password = '';
  @state() private _loading = false;
  @state() private _error = '';

  private async _onSubmitPhone(e?: Event) {
    e?.preventDefault();
    if (!this._phone.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.client.sendPhoneNumber(this._phone.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _onSubmitCode(e?: Event) {
    e?.preventDefault();
    if (!this._code.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.client.sendAuthCode(this._code.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _onSubmitPassword(e?: Event) {
    e?.preventDefault();
    if (!this._password.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.client.sendPassword(this._password.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private _renderPhone() {
    return html`
      <form @submit=${this._onSubmitPhone}>
        <span class="title">Sign in</span>
        <div class="field">
          <label class="label" for="phone">Phone number</label>
          <input
            id="phone"
            class="input"
            data-testid="phone-input"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            placeholder="+374 XX XXX XXXX"
            .value=${this._phone}
            @input=${(e: InputEvent) => this._phone = (e.target as HTMLInputElement).value}
          >
          <div class="hint">International format</div>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <button class="continue-btn" data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Sending...' : 'Continue'}
        </button>
      </form>
    `;
  }

  private _renderCode() {
    return html`
      <form @submit=${this._onSubmitCode}>
        <span class="title">Enter code</span>
        <div class="field">
          <label class="label" for="code">Authentication code</label>
          <input
            id="code"
            class="input"
            data-testid="code-input"
            type="text"
            autocomplete="one-time-code"
            inputmode="numeric"
            placeholder="12345"
            .value=${this._code}
            @input=${(e: InputEvent) => this._code = (e.target as HTMLInputElement).value}
          >
          <div class="hint">Check your Telegram app or SMS</div>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <button class="continue-btn" data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Verifying...' : 'Continue'}
        </button>
      </form>
    `;
  }

  private _renderPassword() {
    return html`
      <form @submit=${this._onSubmitPassword}>
        <span class="title">Two-factor auth</span>
        <div class="field">
          <label class="label" for="password">Password</label>
          <input
            id="password"
            class="input"
            data-testid="password-input"
            type="password"
            autocomplete="current-password"
            placeholder="Password"
            .value=${this._password}
            @input=${(e: InputEvent) => this._password = (e.target as HTMLInputElement).value}
          >
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <button class="continue-btn" data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Verifying...' : 'Continue'}
        </button>
      </form>
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
