import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'mudita-ui';
import styles from './dialog-item.css?inline';

@customElement('dialog-item')
export class DialogItem extends LitElement {
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
          ${
            this.unreadCount > 0
              ? html`<mk-badge class="badge" .count=${this.unreadCount}></mk-badge>`
              : nothing
          }
        </div>
      </div>
    `;
  }
}
