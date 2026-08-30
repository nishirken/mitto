import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import 'mudita-ui';
import styles from './dialog-header.css?inline';

@customElement('dialog-header')
export class DialogHeader extends LitElement {
  static styles = unsafeCSS(styles);

  @property() contactName = '';

  private _handleBack() {
    this.dispatchEvent(new Event('back'));
  }

  private _handleSettings() {
    this.dispatchEvent(new Event('settings'));
  }

  render() {
    return html`
      <mk-header>
        <mk-icon-button
          bordered
          slot="start"
          icon="arrow-left"
          label="Back"
          @click=${this._handleBack}
        ></mk-icon-button>
        <span class="contact">${this.contactName}</span>
        <mk-icon-button
          bordered
          slot="end"
          icon="settings"
          label="Settings"
          data-testid="dialog.settings-button"
          @click=${this._handleSettings}
        ></mk-icon-button>
      </mk-header>
    `;
  }
}
