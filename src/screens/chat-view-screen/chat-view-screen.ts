import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from 'router';
import { formatTimestamp } from 'utils/format-timestamp';
import './chat-view-header';
import './chat-view-footer';
import './message-view';
import 'components/scroll-container/scroll-container';
import type { ScrollContainer, PageChangeDetail } from 'components/scroll-container/scroll-container';
import styles from './chat-view-screen.css?inline';
import { ChatViewStore } from './chat-view-store';
import type { Services } from 'api/services-context';
import { servicesContext } from 'api/services-context';
import { consume } from '@lit/context';

@customElement('chat-view-screen')
export class ChatViewScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @property({ type: Number }) chatId = 0;
  @consume({ context: servicesContext, subscribe: true })
  services!: Services;
  private _chatViewStore!: ChatViewStore;
  @query('scroll-container') private _scrollContainer?: ScrollContainer;

  connectedCallback() {
    super.connectedCallback();
    if (this.chatId === 0) {
      throw new Error('chatId property is required');
    }

    this._chatViewStore = new ChatViewStore(
      this.services.client,
      this.services.chatListStore,
      this.services.offlineStorage,
    );
    this._chatViewStore.init(this.chatId).then(() => this._scrollToBottom());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._chatViewStore?.dispose();
  }

  private async _scrollToBottom() {
    await this.updateComplete;
    this._scrollContainer?.scrollToLastPage();
  }

  private _onPageChange = (e: CustomEvent<PageChangeDetail>): void => {
    if (e.detail.isFirst) void this._loadOlderMessages();
  };

  private async _loadOlderMessages() {
    const container = this._scrollContainer;
    if (!this._chatViewStore || !container) return;

    const prevCount = container.pageCount;
    await this._chatViewStore.loadMore();
    await this.updateComplete;
    // Older messages prepend at the top and shift content down. The handler fires
    // at the first page (index 0), so advance by the number of pages added to keep
    // the same messages on screen instead of snapping back to the top.
    const added = container.pageCount - prevCount;
    if (added > 0) container.scrollToPage(added);
  }

  private _onBack() {
    navigate('chats');
  }

  private _onSend(e: CustomEvent<string>) {
    this._chatViewStore?.sendMessage(e.detail);
    void this._scrollToBottom();
  }

  render() {
    const messages = this._chatViewStore?.messages.get() ?? [];
    const contactName = this.services.chatListStore.getChat(this.chatId)?.name ?? '';

    return html`
      <chat-view-header .contactName=${contactName} @back=${this._onBack}></chat-view-header>
      <scroll-container class="list" @pagechange=${this._onPageChange}>
        <div class="messages" id="messages">
          ${messages.map(
            (msg) => html`
              <message-view
                ?outgoing=${msg.isOutgoing}
                .text=${msg.text}
                .timestamp=${formatTimestamp(msg.date)}
              ></message-view>
            `
          )}
        </div>
      </scroll-container>
      <chat-view-footer @send=${this._onSend}></chat-view-footer>
    `;
  }
}
