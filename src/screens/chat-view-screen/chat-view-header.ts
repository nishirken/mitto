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
        <mk-icon-button bordered slot="start" label="Back" @click=${this._onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </mk-icon-button>
        <span class="contact">${this.contactName}</span>
      </mk-header>
    `;
  }
}
