import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import 'mudita-ui';
import styles from './dialog-item.css?inline';
import { formatTimestamp } from '../../utils/format-timestamp';

@customElement('dialog-item')
export class DialogItem extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) name = '';
  @property({ type: Number }) timestamp = 0;
  @property({ type: Number }) unreadCount = 0;
  @property({ type: String }) message?: string;

  render() {
    return html`
      <div class="content">
        <div class="top">
          <span class="name">${this.name}</span>
          <span class="time">${formatTimestamp(this.timestamp)}</span>
        </div>
        <div class="bottom">
          ${when(this.message, () => html`<span class="preview">${this.message}</span>`)}
          ${when(
            this.unreadCount > 0,
            () => html`<mk-badge class="badge" .count=${this.unreadCount}></mk-badge>`,
          )}
        </div>
      </div>
    `;
  }
}
