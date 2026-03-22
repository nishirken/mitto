import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { Message } from 'types/telegram';
import { navigate } from 'router';
import 'components/mk-header';
import 'components/mk-icon-button';
import 'components/mk-input';
import 'components/mk-button';
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
      <mk-header>
        <mk-icon-button class="back" slot="start" label="Back" @click=${this._onBack}>←</mk-icon-button>
        <span class="contact">${this.contactName}</span>
      </mk-header>
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
        <mk-input type="text" placeholder="Message…"></mk-input>
        <mk-button>Send</mk-button>
      </div>
    `;
  }
}
