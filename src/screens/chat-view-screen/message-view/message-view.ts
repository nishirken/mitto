import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './message-view.css?inline';
import { MessageMedia } from '../chat-view-projection';
import './media-attachment/media-attachment';
import './voice-player/voice-player';

@customElement('message-view')
export class MessageView extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true }) outgoing = false;
  @property({ type: Object, attribute: false }) media?: MessageMedia;
  @property() text = '';
  @property() timestamp = '';

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

  render() {
    return html`
      <span class="message">
        ${this._renderMedia}
        ${this.text
          ? html`<span class="text" data-testid="message-view.text">${this.text}</span>`
          : nothing}
      </span>
      <span class="msg-time">${this.timestamp}</span>
    `;
  }
}
