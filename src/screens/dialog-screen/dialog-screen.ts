import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from 'router';
import './dialog-header';
import './dialog-footer';
import './message-view/message-view';
import './media-viewer/media-viewer';
import 'mudita-ui';
import type { ScrollContainer, ScrollDetail } from 'mudita-ui';
import styles from './dialog-screen.css?inline';
import { DialogProjection } from './dialog-projection';
import type { Services } from 'api/services-context';
import { servicesContext } from 'api/services-context';
import { consume } from '@lit/context';
import type { PeerId } from 'services/database';
import { DialogSyncService } from './dialog-sync-service';
import type { MediaOpenDetail } from './message-view/media-attachment/media-attachment';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { ViewportBackfill } from '../viewport-backfill';

@customElement('dialog-screen')
export class DialogScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @property({ attribute: false }) peerId: PeerId = '';
  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  private _dialogProjection!: DialogProjection;
  private _dialogSyncService!: DialogSyncService;
  private _backfill!: ViewportBackfill;
  private readonly _messagesRef: Ref<HTMLDivElement> = createRef();
  private _messagesRO?: ResizeObserver;
  private _scrollContainerClientHeight = 0; // constant height on the device
  @query('scroll-container') private _scrollContainer?: ScrollContainer;
  @state() private _viewer?: MediaOpenDetail;
  @state() private _showScrollDown = false;

  connectedCallback() {
    super.connectedCallback();

    if (!this.peerId) {
      throw new Error('peerId property is required');
    }

    this._dialogSyncService = new DialogSyncService(
      this.services.client,
      this.services.messageRepository,
      this.services.dialogRepository,
      this.services.database,
      this.peerId,
    );
    this._dialogProjection = new DialogProjection(this.services.database, this.peerId);
    this._dialogProjection.init();
    this._backfill = new ViewportBackfill(this._dialogSyncService);
    this._backfill.track(this._dialogSyncService.loadInitial().catch(() => {}));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._messagesRO?.disconnect();
    this._backfill?.dispose();
    this._dialogSyncService?.dispose();
    this._dialogProjection?.dispose();
  }

  private _handleMessagesResize: ResizeObserverCallback = async ([entry]) => {
    const fetched = await this._backfill.run(this._isViewportCovered(entry.contentRect.height));

    if (fetched) this._scrollToFirstUnread();
  };

  private _isViewportCovered(height: number): boolean {
    return height > this._scrollContainerClientHeight;
  }

  protected async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    await this._scrollContainer?.updateComplete;

    return result;
  }

  protected async firstUpdated(): Promise<void> {
    const messages = this._messagesRef.value;

    if (messages) {
      this._messagesRO = new ResizeObserver(this._handleMessagesResize);
      this._messagesRO.observe(messages);
    }

    if (this._scrollContainer) {
      this._scrollContainerClientHeight = this._scrollContainer.clientHeight;
    }

    await this._dialogProjection.firstMessages;
    await this.updateComplete;
    this._scrollToFirstUnread();
  }

  private _handleScroll = ({ top, contentHeight, clientHeight }: ScrollDetail): void => {
    this._showScrollDown = contentHeight - top - clientHeight > clientHeight / 2;
  };

  private _scrollToFirstUnread() {
    const firstUnreadId = this._dialogProjection.firstUnreadId.get();
    const target =
      firstUnreadId === undefined
        ? null
        : this.renderRoot.querySelector(`[data-message-id="${firstUnreadId}"]`);

    if (target) {
      this._scrollContainer?.scrollToElement(target, { position: 'start' });
    } else {
      this._scrollContainer?.scrollToBottom();
    }
  }

  private async _scrollToBottom() {
    await this.updateComplete;
    this._scrollContainer?.scrollToBottom();
  }

  private _handleTop = (): void => {
    void this._loadOlderMessages();
  };

  private async _loadOlderMessages() {
    const container = this._scrollContainer;
    if (!this._dialogSyncService || !container) return;

    const prevHeight = container.contentHeight;
    await this._dialogSyncService.loadMore();
    await this.updateComplete;
    const added = container.contentHeight - prevHeight;
    if (added > 0) container.scrollToOffset(container.currentTop + added);
  }

  private _handleBack() {
    navigate('dialogs');
  }

  private _handleSettings() {
    navigate('settings');
  }

  private _handleMediaOpen = (e: CustomEvent<MediaOpenDetail>): void => {
    this._viewer = e.detail;
  };

  private _handleMediaLoad = (): void => {
    this._scrollContainer?.refresh();
  };

  private _handleViewerClose = (): void => {
    this._viewer = undefined;
  };

  private _handleScrollDown = (): void => {
    this._scrollContainer?.scrollToBottom();
  };

  private _handleSend(e: CustomEvent<string>) {
    const message = e.detail.trim();
    if (message) {
      this._dialogSyncService?.sendMessage(e.detail);
      void this._scrollToBottom();
    }
  }

  render() {
    const messages = this._dialogProjection.messages.get();
    const contactName = this._dialogProjection.peerName.get();

    return html`
      <dialog-header
        .contactName=${contactName}
        @back=${this._handleBack}
        @settings=${this._handleSettings}
      ></dialog-header>
      <div class="list-area">
        <scroll-container
          class="list"
          ?paged=${this.services.settingsStore.pagedScroll('messages')}
          .onTop=${this._handleTop}
          .onScroll=${this._handleScroll}
        >
          <div
            ${ref(this._messagesRef)}
            class="messages"
            id="messages"
            @mediaopen=${this._handleMediaOpen}
            @mediaload=${this._handleMediaLoad}
          >
            ${messages.map(
              (msg) => html`
                <message-view
                  data-message-id=${msg.id}
                  ?outgoing=${msg.isOutgoing}
                  ?read=${msg.isRead}
                  .text=${msg.text}
                  .media=${msg.media}
                  .timestamp=${msg.date}
                ></message-view>
              `,
            )}
          </div>
        </scroll-container>
        ${
          this._showScrollDown
            ? html`<mk-icon-button
              bordered
              class="scroll-down"
              icon="arrow-up"
              label="Scroll to the latest message"
              data-testid="dialog.scroll-down"
              @click=${this._handleScrollDown}
            ></mk-icon-button>`
            : nothing
        }
      </div>
      <dialog-footer @send=${this._handleSend}></dialog-footer>
      ${
        this._viewer
          ? html`<media-viewer
            .url=${this._viewer.url}
            .type=${this._viewer.type}
            @close=${this._handleViewerClose}
          ></media-viewer>`
          : nothing
      }
    `;
  }
}
