import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Chat } from '../types/telegram';
import { navigate } from '../router';
import './chat-item';

@customElement('chat-list-screen')
export class ChatListScreen extends LitElement {
  static styles = css`
    :host { display: block; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      border-bottom: 2px solid #000;
    }
    .title { font-weight: 700; font-size: 13px; }
    .count { font-size: 10px; color: #555; }
  `;

  @property({ type: Array }) chats: Chat[] = [];

  private _onChatClick(chatId: number) {
    navigate(`chat/${chatId}`);
  }

  render() {
    return html`
      <div class="header">
        <span class="title">Telegram</span>
        <span class="count">${this.chats.length} chats</span>
      </div>
      ${this.chats.map(
        (chat) => html`
          <chat-item
            .avatarLetter=${chat.avatarLetter}
            .name=${chat.name}
            .timestamp=${chat.timestamp}
            .preview=${chat.lastMessage}
            .unreadCount=${chat.unreadCount}
            @click=${() => this._onChatClick(chat.id)}
          ></chat-item>
        `
      )}
    `;
  }
}
