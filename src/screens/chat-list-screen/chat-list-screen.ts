import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import { formatTimestamp } from 'utils/format-timestamp';
import 'components/mk-header/mk-header';
import 'components/mk-icon-button/mk-icon-button';
import 'components/mk-loading/mk-loading';
import 'components/scroll-container/scroll-container';
import './chat-item';
import styles from './chat-list-screen.css?inline';
import { DialogListProjection } from './dialog-list-projection';
import { DialogListSyncService } from './dialog-list-sync-service';

@customElement('chat-list-screen')
export class ChatListScreen extends SignalWatcher(LitElement) {
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
    this._dialogListProjection = new DialogListProjection(
      this.services.database,
      this.services.databaseHub,
    );
    void this._dialogListSyncService.loadInitial().catch(() => {});
    this._dialogListProjection.init().catch(() => {});
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._dialogListSyncService.dispose();
    this._dialogListProjection.dispose();
  }

  private _onBottom = (): void => {
    void this._dialogListSyncService.loadMore().catch(() => {});
  };

  private _onChatClick = (chatId: string) => {
    navigate(`chat/${chatId}`);
  };

  private _onSettingsClick = () => {
    navigate('settings');
  };

  render() {
    const chats = this._dialogListProjection.chats.get();

    return html`
      <mk-header headline="Mitto">
        <span class="count" slot="end">${chats.length} chats</span>
        <mk-icon-button
          bordered
          slot="end"
          icon="settings"
          label="Settings"
          data-testid="chat-list.settings-button"
          @click=${this._onSettingsClick}
        ></mk-icon-button>
      </mk-header>
      <scroll-container
        class="list"
        ?paged=${this.services.settingsStore.pagedScroll('conversations')}
        .onBottom=${this._onBottom}
      >
        ${chats.map(
          (chat) => html`
            <chat-item
              .name=${chat.name}
              .timestamp=${formatTimestamp(chat.date)}
              .preview=${chat.topMessage?.text}
              .unreadCount=${chat.unreadCount}
              @click="${() => this._onChatClick(chat.id)}"
            ></chat-item>
          `,
        )}
      </scroll-container>
    `;
  }
}
