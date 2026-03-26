import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import 'components/mk-header/mk-header';
import 'components/mk-input/mk-input';
import 'components/mk-button/mk-button';
import type { MkInput } from 'components/mk-input/mk-input';
import styles from './auth-screen.css?inline';

@customElement('auth-screen')
export class AuthScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @property() private _onSubmit?: VoidFunction;
  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
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
      await this.services.authStore.sendPhoneNumber(this._phone.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _onResendViaSms() {
    this._loading = true;
    this._error = '';
    try {
      await this.services.authStore.resendCodeViaSms();
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
      await this.services.authStore.sendAuthCode(this._code.trim());
      this._onSubmit?.();
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private _renderPhone() {
    return html`
      <form class="form" @submit=${this._onSubmitPhone}>
        <span class="title">Sign in</span>
        <mk-input
          data-testid="phone-input"
          type="tel"
          placeholder="+37455777222"
          label="Phone number"
          hint="International format"
          required=${true}
          .value=${this._phone}
          @input=${(e: Event) => this._phone = (e.target as MkInput).value}
        ></mk-input>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <mk-button data-testid="submit" @click=${this._onSubmitPhone} ?disabled=${this._loading} type="submit">
          ${this._loading ? 'Sending...' : 'Continue'}
        </mk-button>
      </form>
    `;
  }

  private _renderCode(isSmsAvailable: boolean) {
    return html`
      <form class="form" @submit=${this._onSubmitCode}>
        <span class="title">Enter code</span>
        <mk-input
          data-testid="code-input"
          type="text"
          label="Authentication code"
          hint=${'Check your Telegram app or SMS'}
          placeholder="12345"
          required
          minlength="5"
          maxlength="5"
          type="tel"
          .value=${this._code}
          @input=${(e: Event) => this._code = (e.target as MkInput).value}
        ></mk-input>
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <mk-button data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Verifying...' : 'Continue'}
        </mk-button>
        ${isSmsAvailable ? html`
          <mk-button variant="secondary" ?disabled=${this._loading} @click=${this._onResendViaSms}>
            Use SMS instead
          </mk-button>
        ` : ''}
      </form>
    `;
  }

  private _renderAuthState() {
    const authState = this.services.authStore.state.get();

    if (authState === 'wait_phone') {
      return this._renderPhone();
    }

    if (typeof authState === 'object' && 'type' in authState && authState.type === 'wait_code') {
      return this._renderCode(authState.isSmsAvailable);
    }
  }

  render() {
    return html`
      <div class="body">
        ${this._renderAuthState()}
      </div>
    `;
  }
}
