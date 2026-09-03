import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './message-view.css?inline';
import type { MessageMedia } from '../dialog-projection';
import './media-attachment/media-attachment';
import './voice-player/voice-player';
import 'mudita-ui';
import { formatTimestamp } from '../../../utils/format-timestamp';

@customElement('message-view')
export class MessageView extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true }) outgoing = false;
  @property({ type: Boolean, reflect: true }) read = false;
  @property({ type: Object, attribute: false }) media?: MessageMedia;
  @property() text?: string;
  @property({ type: Number }) timestamp: number;

  private get _renderMedia() {
    if (this.media) {
      switch (this.media.type) {
        case 'photo':
        case 'video':
          return html`<media-attachment
            .media=${this.media}
            data-testid="message-view.media"
          ></media-attachment>`;
        case 'voice':
          return html`<voice-player
            .media=${this.media}
            data-testid="message-view.voice"
          ></voice-player>`;
        default:
          return nothing;
      }
    }

    return nothing;
  }

  private get _renderStatus() {
    if (!this.outgoing) return nothing;

    return html`<mk-icon
      class="status"
      .type=${this.read ? 'check-double' : 'check'}
      role="img"
      aria-label=${this.read ? 'Read' : 'Sent'}
      data-testid="message-view.status"
    ></mk-icon>`;
  }

  render() {
    return html`
      <span class="message">
        ${this._renderMedia}
        ${
          this.text
            ? html`<span class="text" data-testid="message-view.text">${this.text}</span>`
            : nothing
        }
      </span>
      <span class="msg-time">${formatTimestamp(this.timestamp)}${this._renderStatus}</span>
    `;
  }
}
