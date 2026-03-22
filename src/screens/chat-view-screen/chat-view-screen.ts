import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { Message } from 'types/telegram';
import { navigate } from 'router';
import styles from './chat-view-screen.css?inline';

@customElement('chat-view-screen')
export class ChatViewScreen extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) contactName = '';
  @property({ type: Number }) chatId = 0;
  @consume({ context: servicesContext, subscribe: true })
  services?: Services;
  @state() private _messages: Message[] = [];
  @query('#messages') private _messagesContainer?: HTMLElement;

  // Domain methods (loadMessages, onNewMessage) are commented out
  // in TelegramClient — this screen will have runtime errors until they're
  // re-implemented as event-based patterns.

  private async _scrollToBottom() {
    if (this._messagesContainer) {
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    }
  }

  private _onBack() {
    navigate('chats');
  }

  render() {
    return html`
      <div class="header">
        <button class="back" @click=${this._onBack}>←</button>
        <span class="contact">${this.contactName}</span>
      </div>
      <div class="messages" id="messages">
        ${this._messages.map(
          (msg) => html`
            <div class="message ${msg.isOutgoing ? 'outgoing' : 'incoming'}">
              ${msg.text}
              <div class="msg-time">${msg.timestamp}</div>
            </div>
          `
        )}
      </div>
      <div class="footer">
        <input class="input" type="text" placeholder="Message…">
        <button class="send-btn">Send</button>
      </div>
    `;
  }
}
