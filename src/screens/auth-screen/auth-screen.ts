import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { AuthState } from 'types/telegram';
import 'components/mk-header';
import 'components/mk-input';
import 'components/mk-button';
import type { MkInput } from 'components/mk-input';
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
        <mk-input
          data-testid="phone-input"
          type="tel"
          label="Phone number"
          hint="International format"
          placeholder="+374 XX XXX XXXX"
          .value=${this._phone}
          @input=${(e: Event) => this._phone = (e.target as MkInput).value}
        ></mk-input>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <mk-button data-testid="submit" @click=${this._onSubmitPhone} ?disabled=${this._loading}>
          ${this._loading ? 'Sending...' : 'Continue'}
        </mk-button>
      </form>
    `;
  }

  private _renderCode() {
    return html`
      <form @submit=${this._onSubmitCode}>
        <span class="title">Enter code</span>
        <mk-input
          data-testid="code-input"
          type="text"
          label="Authentication code"
          hint="Check your Telegram app or SMS"
          placeholder="12345"
          .value=${this._code}
          @input=${(e: Event) => this._code = (e.target as MkInput).value}
        ></mk-input>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <mk-button data-testid="submit" @click=${this._onSubmitCode} ?disabled=${this._loading}>
          ${this._loading ? 'Verifying...' : 'Continue'}
        </mk-button>
      </form>
    `;
  }

  render() {
    return html`
      <mk-header headline="Mitto"></mk-header>
      <div class="body">
        ${this.authState === 'wait_code' ? this._renderCode() : this._renderPhone()}
      </div>
    `;
  }
}
