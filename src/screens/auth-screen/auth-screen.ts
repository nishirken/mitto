import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { AuthState } from 'types/telegram';
import styles from './auth-screen.css?inline';

@customElement('auth-screen')
export class AuthScreen extends LitElement {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  @property({ type: String }) authState: AuthState = 'wait_phone';
  @state() private _phone = '';
  @state() private _code = '';
  @state() private _loading = false;
  @state() private _error = '';

  private async _onSubmitPhone(e?: Event) {
    e?.preventDefault();
    if (!this._phone.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.services.authClient.sendPhoneNumber(this._phone.trim());
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
      await this.services.authClient.sendAuthCode(this._code.trim());
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

  render() {
    switch (this.authState) {
      case 'wait_code':
        return this._renderCode();
      default:
        return this._renderPhone();
    }
  }
}
