import { LitElement, PropertyValues, html, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from 'router';
import 'components/mk-header/mk-header';
import 'components/mk-icon-button/mk-icon-button';
import 'components/mk-textarea/mk-textarea';
import type { MkTextarea } from 'components/mk-textarea/mk-textarea';
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
  @state() private _message = '';
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
    this._chatViewStore.init(this.chatId);
  }
  
  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._scrollToBottom();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._chatViewStore?.dispose();
  }

  private _scrollToBottom() {
    if (this._messagesContainer) {
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    }
  }

  private _onBack() {
    navigate('chats');
  }

  private _handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const text = this._message.trim();
    if (!text) return;
    this._chatViewStore?.sendMessage(text);
    this._message = '';
    this._scrollToBottom();
  }

  render() {
    const messages = this._chatViewStore?.messages.get() ?? [];
    const contactName = this.services.chatListStore.getChat(this.chatId)?.name ?? '';

    return html`
      <mk-header>
        <mk-icon-button class="back" slot="start" label="Back" @click=${this._onBack}>←</mk-icon-button>
        <span class="contact">${contactName}</span>
      </mk-header>
      <div class="messages" id="messages">
        ${messages.map(
          (msg) => html`
            <div class="message-wrapper ${msg.isOutgoing ? 'outgoing' : 'incoming'}">
              <span class="message">
                ${msg.text}
              </span>
              <span class="msg-time">${msg.formattedDate}</div>
            </div>
          `
        )}
      </div>
      <form @submit=${this._handleSubmit} class="footer">
        <mk-textarea placeholder="Message…" .value=${this._message} @input=${(e: Event) => this._message = (e.target as MkTextarea).value} data-testid="chat-view.message-input"></mk-textarea>
        <mk-icon-button class="send-button" label="Send" type="submit" data-testid="chat-view.send-button">→</mk-icon-button>
      </form>
    `;
  }
}
