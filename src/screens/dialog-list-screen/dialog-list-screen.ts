import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import { formatTimestamp } from 'utils/format-timestamp';
import 'mudita-ui';
import './dialog-item';
import styles from './dialog-list-screen.css?inline';
import { DialogListProjection } from './dialog-list-projection';
import { DialogListSyncService } from './dialog-list-sync-service';
import type { PeerId } from 'services/database';

@customElement('dialog-list-screen')
export class DialogListScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);
  private _dialogListProjection!: DialogListProjection;
  private _dialogListSyncService!: DialogListSyncService;

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  connectedCallback() {
    super.connectedCallback();
    this._dialogListSyncService = new DialogListSyncService(
      this.services.client,
      this.services.dialogRepository,
      this.services.messageRepository,
    );
    this._dialogListProjection = new DialogListProjection(this.services.database);
    void this._dialogListSyncService.loadInitial().catch(() => {});
    this._dialogListProjection.init();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._dialogListSyncService.dispose();
    this._dialogListProjection.dispose();
  }

  private _onBottom = (): void => {
    void this._dialogListSyncService.loadMore().catch(() => {});
  };

  private _onDialogClick = (peerId: PeerId) => {
    navigate(`dialog/${peerId}`);
  };

  private _onSettingsClick = () => {
    navigate('settings');
  };

  render() {
    const dialogs = this._dialogListProjection.dialogs.get();

    return html`
      <mk-header headline="Mitto">
        <span class="count" slot="end">${dialogs.length} chats</span>
        <mk-icon-button
          bordered
          slot="end"
          icon="settings"
          label="Settings"
          data-testid="dialog-list.settings-button"
          @click=${this._onSettingsClick}
        ></mk-icon-button>
      </mk-header>
      <scroll-container
        class="list"
        ?paged=${this.services.settingsStore.pagedScroll('conversations')}
        .onBottom=${this._onBottom}
      >
        ${dialogs.map(
          (dialog) => html`
            <dialog-item
              .name=${dialog.name}
              .timestamp=${formatTimestamp(dialog.date)}
              .preview=${dialog.topMessage?.text}
              .unreadCount=${dialog.unreadCount}
              @click="${() => this._onDialogClick(dialog.id)}"
            ></dialog-item>
          `,
        )}
      </scroll-container>
    `;
  }
}
