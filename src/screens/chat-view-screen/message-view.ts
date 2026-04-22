import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './message-view.css?inline';

@customElement('message-view')
export class MessageView extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean, reflect: true }) outgoing = false;
  @property() text = '';
  @property() timestamp = '';

  render() {
    return html`
      <span class="message">${this.text}</span>
      <span class="msg-time">${this.timestamp}</span>
    `;
  }
}
