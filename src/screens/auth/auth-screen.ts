import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { NextType, WaitCodeState, WaitPasswordState } from './auth-store';
import 'mudita-ui';
import type { MkInput } from 'mudita-ui';
import styles from './auth-screen.css?inline';

function codeHint({ codeType, beginning }: WaitCodeState): string {
  switch (codeType) {
    case 'app':
      return 'Check your Telegram app';
    case 'sms':
      return 'Check your SMS';
    case 'call':
      return 'Answer the call';
    case 'fragment':
      return 'Check Fragment';
    case 'word':
      return beginning ? `Check your SMS for "${beginning}…"` : 'Check your SMS for the word';
    case 'phrase':
      return beginning ? `Check your SMS for "${beginning}…"` : 'Check your SMS for the phrase';
    case 'unknown':
      return 'Check your messages';
  }
}

const NEXT_TYPE_LABELS: Record<NextType, string> = {
  sms: 'Get code via SMS',
  call: 'Get code by phone call',
  fragment: 'Get code via Fragment',
};

@customElement('auth-screen')
export class AuthScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  @state() private _phone = '';
  @state() private _code = '';
  @state() private _password = '';
  @state() private _loading = false;
  @state() private _error = '';

  private async _handleSubmitPhone(e?: Event) {
    e?.preventDefault();
    if (!this._phone.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.services.authStore.sendCode(this._phone.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _handleResend() {
    this._loading = true;
    this._error = '';
    try {
      await this.services.authStore.resendCode();
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _handleSubmitCode(e?: Event) {
    e?.preventDefault();
    if (!this._code.trim()) return;
    this._loading = true;
    this._error = '';
    try {
      await this.services.authStore.signIn(this._code.trim());
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _handleSubmitPassword(e?: Event) {
    e?.preventDefault();
    if (!this._password) return;
    this._loading = true;
    this._error = '';
    try {
      await this.services.authStore.checkPassword(this._password);
    } catch (e) {
      this._error = (e as Error).message;
    }
    this._loading = false;
  }

  private async _handleRetry() {
    this._loading = true;
    this._error = '';
    await this.services.authStore.checkAuthorization();
    this._loading = false;
  }

  private _renderPhone() {
    return html`
      <form class="form" @submit=${this._handleSubmitPhone}>
        <h1 class="title">Sign in</h1>
        <mk-input
          data-testid="phone-input"
          type="tel"
          autocomplete="tel"
          placeholder="+12345678900"
          label="Phone number"
          hint="International format"
          required=${true}
          .value=${this._phone}
          @input=${(e: Event) => (this._phone = (e.target as MkInput).value)}
        ></mk-input>
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : ''}
        <mk-button data-testid="submit" @click=${this._handleSubmitPhone} ?disabled=${this._loading} type="submit">
          ${this._loading ? 'Sending...' : 'Continue'}
        </mk-button>
      </form>
    `;
  }

  private _renderCode(state: WaitCodeState) {
    const { codeLength, nextType, fragmentUrl } = state;
    const length = codeLength ?? undefined;

    return html`
      <form class="form" @submit=${this._handleSubmitCode}>
        <h1 class="title">Enter code</h1>
        <mk-input
          data-testid="code-input"
          label="Authentication code"
          autocomplete="one-time-code"
          hint=${codeHint(state)}
          required
          minlength=${ifDefined(length)}
          maxlength=${ifDefined(length)}
          type=${codeLength === null ? 'text' : 'tel'}
          .value=${this._code}
          @input=${(e: Event) => (this._code = (e.target as MkInput).value)}
        ></mk-input>
        ${
          fragmentUrl
            ? html`
          <a class="fragment-link" data-testid="fragment-link" href=${fragmentUrl} target="_blank" rel="noreferrer">
            ${fragmentUrl}
          </a>
        `
            : ''
        }
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : ''}
        <mk-button data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Verifying...' : 'Continue'}
        </mk-button>
        ${
          nextType
            ? html`
          <mk-button data-testid="resend" variant="secondary" ?disabled=${this._loading} @click=${this._handleResend}>
            ${NEXT_TYPE_LABELS[nextType]}
          </mk-button>
        `
            : ''
        }
      </form>
    `;
  }

  private _renderPassword({ hint }: WaitPasswordState) {
    return html`
      <form class="form" @submit=${this._handleSubmitPassword}>
        <h1 class="title">Enter password</h1>
        <mk-input
          data-testid="password-input"
          type="password"
          autocomplete="current-password"
          label="Password"
          hint=${hint ?? 'Two-step verification is enabled'}
          required
          .value=${this._password}
          @input=${(e: Event) => (this._password = (e.target as MkInput).value)}
        ></mk-input>
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : ''}
        <mk-button data-testid="submit" type="submit" ?disabled=${this._loading}>
          ${this._loading ? 'Checking...' : 'Continue'}
        </mk-button>
      </form>
    `;
  }

  private _renderError() {
    return html`
      <div class="form">
        <h1 class="title">Something went wrong</h1>
        <div class="error">Could not reach Telegram.</div>
        <mk-button data-testid="retry" ?disabled=${this._loading} @click=${this._handleRetry}>
          ${this._loading ? 'Retrying...' : 'Try again'}
        </mk-button>
      </div>
    `;
  }

  private _renderAuthState() {
    const authState = this.services.authStore.state.get();

    switch (authState.type) {
      case 'wait_phone':
        return this._renderPhone();
      case 'error':
        return this._renderError();
      case 'wait_code':
        return this._renderCode(authState);
      case 'wait_password':
        return this._renderPassword(authState);
      case 'loading':
      case 'ready':
        return nothing;
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
