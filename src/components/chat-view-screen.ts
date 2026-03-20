import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Message } from '../types/telegram';
import { navigate } from '../router';

@customElement('chat-view-screen')
export class ChatViewScreen extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-bottom: 2px solid #000;
    }
    .back {
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
    }
    .contact { font-weight: 700; font-size: 12px; }
    .messages {
      flex: 1;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }
    .message {
      border: 1px solid #000;
      padding: 4px 8px;
      max-width: 75%;
      font-size: 10px;
    }
    .incoming { align-self: flex-start; }
    .outgoing { align-self: flex-end; background: #e0e0e0; }
    .msg-time {
      text-align: right;
      font-size: 8px;
      color: #555;
      margin-top: 1px;
    }
    .footer {
      display: flex;
      gap: 6px;
      padding: 5px 10px;
      border-top: 2px solid #000;
    }
    .input {
      flex: 1;
      border: 1px solid #000;
      padding: 4px 8px;
      font-size: 10px;
      font-family: inherit;
      outline: none;
    }
    .send-btn {
      background: #000;
      color: #fff;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      font-family: inherit;
    }
  `;

  @property({ type: String }) contactName = '';
  @property({ type: Array }) messages: Message[] = [];

  private _onBack() {
    navigate('chats');
  }

  render() {
    return html`
      <div class="header">
        <button class="back" @click=${this._onBack}>←</button>
        <span class="contact">${this.contactName}</span>
      </div>
      <div class="messages">
        ${this.messages.map(
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
