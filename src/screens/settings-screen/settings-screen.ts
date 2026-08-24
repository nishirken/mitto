import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import 'mudita-ui';
import type { MkCheckbox } from 'mudita-ui';
import styles from './settings-screen.css?inline';

@customElement('settings-screen')
export class SettingsScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  @state() private _signingOut = false;

  private _onBack = () => {
    navigate('dialogs');
  };

  private _onConversationsChange = (e: Event) => {
    void this.services.settingsStore.setPagedScroll(
      'conversations',
      (e.target as MkCheckbox).checked,
    );
  };

  private _onMessagesChange = (e: Event) => {
    void this.services.settingsStore.setPagedScroll('messages', (e.target as MkCheckbox).checked);
  };

  private _onSignOut = async () => {
    if (this._signingOut) return;
    this._signingOut = true;
    try {
      if (await this.services.authStore.logout()) {
        navigate('dialogs');
        window.location.reload();
      }
    } finally {
      this._signingOut = false;
    }
  };

  render() {
    const settings = this.services.settingsStore.settings.get();

    return html`
      <mk-header headline="Settings">
        <mk-icon-button
          bordered
          slot="start"
          icon="arrow-left"
          label="Back"
          data-testid="settings.back"
          @click=${this._onBack}
        ></mk-icon-button>
      </mk-header>

      <div class="body">
        <section>
          <h2>Conversations</h2>
          <mk-checkbox
            label="Paged scroll"
            .checked=${settings.conversations.pagedScroll}
            data-testid="settings.conversations.paged-scroll"
            @change=${this._onConversationsChange}
          ></mk-checkbox>
        </section>

        <section>
          <h2>Messages</h2>
          <mk-checkbox
            label="Paged scroll"
            .checked=${settings.messages.pagedScroll}
            data-testid="settings.messages.paged-scroll"
            @change=${this._onMessagesChange}
          ></mk-checkbox>
        </section>
      </div>

      <footer>
        <mk-button
          variant="secondary"
          data-testid="settings.sign-out"
          ?disabled=${this._signingOut}
          @click=${this._onSignOut}
        >${this._signingOut ? 'Signing out…' : 'Sign out'}</mk-button>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'settings-screen': SettingsScreen;
  }
}
