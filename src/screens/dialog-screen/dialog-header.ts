import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'mudita-ui';
import styles from './dialog-header.css?inline';

@customElement('dialog-header')
export class DialogHeader extends LitElement {
  static styles = unsafeCSS(styles);

  @property() contactName = '';

  private _onBack() {
    this.dispatchEvent(new Event('back'));
  }

  render() {
    return html`
      <mk-header>
        <mk-icon-button
          bordered
          slot="start"
          icon="arrow-left"
          label="Back"
          @click=${this._onBack}
        ></mk-icon-button>
        <span class="contact">${this.contactName}</span>
      </mk-header>
    `;
  }
}
