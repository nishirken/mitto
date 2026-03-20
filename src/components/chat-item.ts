import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('chat-item')
export class ChatItem extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 5px 10px;
      border-bottom: 1px solid #000;
      cursor: pointer;
    }
    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1.5px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .content { flex: 1; min-width: 0; }
    .top { display: flex; justify-content: space-between; }
    .name { font-weight: 700; font-size: 11px; }
    .time { font-size: 9px; color: #555; }
    .preview {
      font-size: 9px;
      color: #555;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge {
      background: #000;
      color: #fff;
      font-size: 8px;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      font-weight: 700;
    }
  `;

  @property({ type: String }) avatarLetter = '';
  @property({ type: String }) name = '';
  @property({ type: String }) timestamp = '';
  @property({ type: String }) preview = '';
  @property({ type: Number }) unreadCount = 0;

  render() {
    return html`
      <div class="avatar">${this.avatarLetter}</div>
      <div class="content">
        <div class="top">
          <span class="name">${this.name}</span>
          <span class="time">${this.timestamp}</span>
        </div>
        <div class="preview">${this.preview}</div>
      </div>
      ${this.unreadCount > 0
        ? html`<div class="badge">${this.unreadCount}</div>`
        : ''}
    `;
  }
}
