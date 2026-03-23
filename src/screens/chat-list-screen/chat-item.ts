import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'components/mk-badge/mk-badge';
import styles from './chat-item.css?inline';

@customElement('chat-item')
export class ChatItem extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) name = '';
  @property({ type: String }) timestamp = '';
  @property({ type: String }) preview = '';
  @property({ type: Number }) unreadCount = 0;

  render() {
    return html`
      <div class="content">
        <div class="top">
          <span class="name">${this.name}</span>
          <span class="time">${this.timestamp}</span>
        </div>
        <div class="bottom">
          <span class="preview">${this.preview}</span>
          ${this.unreadCount > 0
            ? html`<mk-badge class="badge" .count=${this.unreadCount}></mk-badge>`
            : nothing}
        </div>
      </div>
    `;
  }
}
