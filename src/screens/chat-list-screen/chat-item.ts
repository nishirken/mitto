import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './chat-item.css?inline';

@customElement('chat-item')
export class ChatItem extends LitElement {
  static styles = unsafeCSS(styles);

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
