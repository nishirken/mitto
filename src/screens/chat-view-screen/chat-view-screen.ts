import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from 'router';
import './chat-view-header';
import './chat-view-footer';
import './message-view';
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
  private _chatViewStore?: ChatViewStore;
  @query('#messages') private _messagesContainer?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    if (this.chatId === 0) {
      throw new Error('chatId property is required');
    }

    this._chatViewStore = new ChatViewStore(
      this.services.client,
      this.services.chatListStore,
    );
    this._chatViewStore.init(this.chatId)
      .then(() => this.updateComplete)
      .then(() => this._scrollToBottom());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._chatViewStore?.dispose();
  }

  private _scrollToBottom() {
    if (this._messagesContainer) {
      console.log(this._messagesContainer.scrollTop, this._messagesContainer.scrollHeight);
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    }
  }

  private _onBack() {
    navigate('chats');
  }

  private _onSend(e: CustomEvent<string>) {
    this._chatViewStore?.sendMessage(e.detail);
    this._scrollToBottom();
  }

  render() {
    const messages = this._chatViewStore?.messages.get() ?? [];
    const contactName = this.services.chatListStore.getChat(this.chatId)?.name ?? '';

    return html`
      <chat-view-header .contactName=${contactName} @back=${this._onBack}></chat-view-header>
      <div class="messages" id="messages">
        ${messages.map(
          (msg) => html`
            <message-view
              ?outgoing=${msg.isOutgoing}
              .text=${msg.text}
              .timestamp=${msg.formattedDate}
            ></message-view>
          `
        )}
      </div>
      <chat-view-footer @send=${this._onSend}></chat-view-footer>
    `;
  }
}
