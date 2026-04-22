import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'components/mk-header/mk-header';
import 'components/mk-icon-button/mk-icon-button';
import styles from './chat-view-header.css?inline';

@customElement('chat-view-header')
export class ChatViewHeader extends LitElement {
  static styles = unsafeCSS(styles);

  @property() contactName = '';

  private _onBack() {
    this.dispatchEvent(new Event('back'));
  }

  render() {
    return html`
      <mk-header>
        <mk-icon-button bordered class="back" slot="start" label="Back" @click=${this._onBack}>←</mk-icon-button>
        <span class="contact">${this.contactName}</span>
      </mk-header>
    `;
  }
}
