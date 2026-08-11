import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from 'router';
import { formatTimestamp } from 'utils/format-timestamp';
import './chat-view-header';
import './chat-view-footer';
import './message-view/message-view';
import './media-viewer/media-viewer';
import 'components/scroll-container/scroll-container';
import type { ScrollContainer } from 'components/scroll-container/scroll-container';
import styles from './chat-view-screen.css?inline';
import { ChatViewProjection } from './chat-view-projection';
import type { Services } from 'api/services-context';
import { servicesContext } from 'api/services-context';
import { consume } from '@lit/context';
import type { PeerId } from 'services/database';
import { DialogSyncService } from './dialog-sync-service';
import type { MediaOpenDetail } from './message-view/media-attachment/media-attachment';

@customElement('chat-view-screen')
export class ChatViewScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @property({ type: String }) chatId = '';
  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  private _chatViewProjection!: ChatViewProjection;
  private _dialogSyncService!: DialogSyncService;
  @query('scroll-container') private _scrollContainer?: ScrollContainer;
  @state() private _viewer?: MediaOpenDetail;
  private _initialScrollDone = false;

  connectedCallback() {
    super.connectedCallback();

    if (!this.chatId) {
      throw new Error('chatId property is required');
    }

    this._dialogSyncService = new DialogSyncService(
      this.services.client,
      this.services.messageRepository,
      this.services.dialogRepository,
      this.services.database,
      this.chatId as PeerId,
    );
    this._chatViewProjection = new ChatViewProjection(
      this.services.database,
      this.services.databaseHub,
      this.chatId as PeerId,
    );
    this._chatViewProjection.init();
    this._dialogSyncService.loadInitial();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._dialogSyncService?.dispose();
    this._chatViewProjection?.dispose();
  }

  protected updated() {
    if (this._initialScrollDone || this._chatViewProjection.messages.get().length === 0) return;

    this._initialScrollDone = true;
    void this._scrollToFirstUnread();
  }

  private async _scrollToFirstUnread() {
    await this.updateComplete;

    const firstUnreadId = this._chatViewProjection.firstUnreadId.get();
    const target =
      firstUnreadId === undefined
        ? null
        : this.renderRoot.querySelector(`[data-message-id="${firstUnreadId}"]`);

    if (target) {
      this._scrollContainer?.scrollToElement(target);

      return;
    }

    this._scrollContainer?.scrollToBottom();
  }

  private async _scrollToBottom() {
    await this.updateComplete;
    this._scrollContainer?.scrollToBottom();
  }

  private _onTop = (): void => {
    void this._loadOlderMessages();
  };

  private async _loadOlderMessages() {
    const container = this._scrollContainer;
    if (!this._dialogSyncService || !container) return;

    const prevCount = container.pageCount;
    await this._dialogSyncService.loadMore();
    await this.updateComplete;
    const added = container.pageCount - prevCount;
    if (added > 0) container.scrollToPage(added);
  }

  private _onBack() {
    navigate('chats');
  }

  private _onMediaOpen = (e: CustomEvent<MediaOpenDetail>): void => {
    this._viewer = e.detail;
  };

  private _onMediaLoad = (): void => {
    this._scrollContainer?.refresh();
  };

  private _onViewerClose = (): void => {
    this._viewer = undefined;
  };

  private _onSend(e: CustomEvent<string>) {
    const message = e.detail.trim();
    if (message) {
      this._dialogSyncService?.sendMessage(e.detail);
      void this._scrollToBottom();
    }
  }

  render() {
    const messages = this._chatViewProjection.messages.get();
    const contactName = this._chatViewProjection.peerName.get();

    return html`
      <chat-view-header .contactName=${contactName} @back=${this._onBack}></chat-view-header>
      <scroll-container
        class="list"
        ?paged=${this.services.settingsStore.pagedScroll('messages')}
        .onTop=${this._onTop}
      >
        <div
          class="messages"
          id="messages"
          @mediaopen=${this._onMediaOpen}
          @mediaload=${this._onMediaLoad}
        >
          ${messages.map(
            (msg) => html`
              <message-view
                data-message-id=${msg.id}
                ?outgoing=${msg.isOutgoing}
                ?read=${msg.isRead}
                .text=${msg.text}
                .media=${msg.media}
                .timestamp=${formatTimestamp(msg.date)}
              ></message-view>
            `,
          )}
        </div>
      </scroll-container>
      <chat-view-footer @send=${this._onSend}></chat-view-footer>
      ${
        this._viewer
          ? html`<media-viewer
            .url=${this._viewer.url}
            .type=${this._viewer.type}
            @close=${this._onViewerClose}
          ></media-viewer>`
          : nothing
      }
    `;
  }
}
